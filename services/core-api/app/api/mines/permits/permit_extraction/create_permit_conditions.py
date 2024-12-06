import uuid
from difflib import SequenceMatcher
from typing import List, Optional

from app.api.mines.permits.permit_amendment.models.permit_amendment import (
    PermitAmendment,
)
from app.api.mines.permits.permit_conditions.models.permit_condition_category import (
    PermitConditionCategory,
)
from app.api.mines.permits.permit_conditions.models.permit_conditions import (
    PermitConditions,
)
from app.api.mines.permits.permit_extraction.models.permit_extraction_task import (
    PermitExtractionTask,
)
from app.api.mines.reports.models.mine_report_permit_requirement import (
    MineReportPermitRequirement,
)
from app.extensions import db
from dateutil.parser import parse
from flask import current_app

from .models.permit_condition_result import (
    CreatePermitConditionsResult,
    PermitConditionResult,
)

indentation_type_code_mapping = {
    0: None,
    1: 'SEC',
    2: 'CON',
    3: 'LIS',
    4: 'LIS',
    5: 'LIS',
}

# For conditions that don't match any category, put them in a "Terms and conditions" category
DEFAULT_CATEGORY_TEXT = 'Terms and Conditions'

def create_permit_conditions_from_task(task: PermitExtractionTask):
    """
    Create permit conditions from the task result.
    """
    result = task.task_result
    last_condition_id_by_hierarchy = {}
    current_category = None
    try:
        result = CreatePermitConditionsResult.model_validate(result)

        has_category = any([condition.is_top_level_section for condition in result.conditions])

        conditions = result.conditions
        if not has_category:
            top_level_section = PermitConditionResult(
                section='A',
                condition_text=DEFAULT_CATEGORY_TEXT
            )
            for c in conditions:
                c.set_section(top_level_section)
            conditions = [top_level_section] + conditions

        num_categories = 0

        default_section = None

        for idx, condition in enumerate(conditions):
            if condition.is_top_level_section:        
                section_category = _create_permit_condition_category(
                    condition=condition,
                    permit_amendment=task.permit_amendment,
                    display_order=num_categories,
                    step=condition.step
                )
                if condition.condition_text == DEFAULT_CATEGORY_TEXT:
                    default_section = section_category
                current_category = section_category
                num_categories += 1
            else:            
                parent = _determine_parent(condition, last_condition_id_by_hierarchy)
                type_code = _map_condition_to_type_code(condition)

                title_cond = None

                if not current_category and not default_section:
                    default_section = _create_permit_condition_category(
                        condition=PermitConditionResult(
                            section='A',
                            condition_text=DEFAULT_CATEGORY_TEXT
                        ),
                        permit_amendment=task.permit_amendment,
                        display_order=num_categories,
                        step='A'
                    )

                category_code = current_category or default_section
                if condition.condition_title:
                    title_cond = _create_title_condition(task, category_code, condition, parent, idx, type_code)

                parent_condition_id = _get_parent_condition_id(title_cond, parent)
                cond = _create_permit_condition(task, category_code, condition, parent_condition_id, idx, type_code)

                hierarchy_key = ".".join(condition.numbering_structure)
                last_condition_id_by_hierarchy[hierarchy_key] = cond
    
        db.session.commit()
    except:
        db.session.rollback()
        raise

    

def _map_condition_to_type_code(condition: PermitConditionResult):
    """
    The type code is based on the indentation level of the condition
    Example: ['A', '1', 'a', 'i', ''] would have an indentation of 4 -> type code is 'LIS'
    Example: ['A', '1', '', '', ''] would have an indentation of 2 -> type code is 'CON'
    Example: ['A', '', '', '', ''] would have an indentation of 1 -> type code is 'SEC'
    """
    indentation = next((i-1 for i, x in enumerate(condition.numbering_structure) if x == ''), 0)
    type_code = indentation_type_code_mapping[indentation]
    
    if not type_code:
        current_app.logger.error(f"Could not determine type code for condition {condition}")

    return type_code or 'LIS'

def _create_title_condition(task, current_category, condition, parent, idx, type_code) -> PermitConditionResult:
    condition = PermitConditions(
        permit_amendment_id=task.permit_amendment.permit_amendment_id,
        permit_condition_guid=uuid.uuid4(),
        condition_category_code=current_category,
        condition=condition.condition_title,
        condition_type_code=type_code,
        parent_permit_condition_id=parent.permit_condition_id if parent else None,
        display_order=idx,
        meta=condition.meta,
        _step=condition.step,
    )

    db.session.add(condition)
    db.session.flush()  # This assigns an ID to title_cond without committing the transaction
    return condition

def _get_parent_condition_id(title_cond: PermitConditionResult, parent: PermitConditionResult) -> Optional[str]:
    if title_cond:
        # If the condition has a title, the parent is the title condition
        return title_cond.permit_condition_id
    elif parent:
        return parent.permit_condition_id
    else:
        return None

def _create_permit_condition(task, current_category, condition, parent_condition_id, idx, type_code) -> PermitConditions:
    condition = PermitConditions(
        permit_amendment_id=task.permit_amendment.permit_amendment_id,
        permit_condition_guid=uuid.uuid4(),
        condition_category_code=current_category,
        condition=condition.condition_text,
        condition_type_code=type_code,
        parent_permit_condition_id=parent_condition_id,
        display_order=idx,
        meta=condition.meta,
        _step=condition.step if not condition.condition_title else '', # If the condition has a title, the parent is the title condition, which has the numbering associated with it already
    )
    db.session.add(condition)

    db.session.flush()  # This assigns an ID to cond without committing the transaction

    report_requirement = _create_permit_condition_report_requirement(task, condition, condition.permit_condition_id)

    if report_requirement:
        db.session.add(report_requirement)
        db.session.flush()

    return condition

def _create_permit_condition_report_requirement(task, condition: PermitConditionResult, condition_id) -> Optional[MineReportPermitRequirement]:
    meta = condition.meta or {}
    questions = meta.get('questions', [])

    # Initialize variables
    require_report = False
    recurring = False
    frequency = None
    mention_chief_inspector = False
    mention_chief_permitting_officer = False
    initial_due_date = None
    report_name = None

    # Extract answers from the questions
    for q in questions:
        key = q.get('question_key')
        answer = q.get('answer')
        if key == 'require_report':
            require_report = answer
        elif key == 'due_date':
            initial_due_date = answer  # Parse date if necessary
        elif key == 'recurring':
            recurring = answer
        elif key == 'frequency':
            frequency = answer
        elif key == 'mention_chief_inspector':
            mention_chief_inspector = answer
        elif key == 'mention_chief_permitting_officer':
            mention_chief_permitting_officer = answer
        elif key == 'report_name':
            report_name = answer

    if not require_report:
        return None
    
    if initial_due_date:
        try:
            initial_due_date = parse(initial_due_date)
        except ValueError:
            current_app.logger.error(f"Could not parse due date for condition {condition_id}: {initial_due_date}")
            initial_due_date = None

    # Determine cim_or_cpo based on mentions
    cim_or_cpo = None
    if mention_chief_inspector and mention_chief_permitting_officer:
        cim_or_cpo = 'BOTH'
    elif mention_chief_inspector:
        cim_or_cpo = 'CIM'
    elif mention_chief_permitting_officer:
        cim_or_cpo = 'CPO'

    # Calculate due_date_period_months based on frequency
    due_date_period_months = None
    if recurring and frequency:
        frequency_mapping = {
            'daily': 1 / 30,
            'weekly': 1 / 4,
            'monthly': 1,
            'quarterly': 3,
            'semi-annual': 6,
            'annual': 12,
            'biennial': 24,
            'triennial': 36,
        }
        due_date_period_months = frequency_mapping.get(frequency.lower())

    # Create the MineReportPermitRequirement
    mine_report_permit_requirement = MineReportPermitRequirement(
        report_name=report_name,
        permit_condition_id=condition_id,
        permit_amendment_id=task.permit_amendment.permit_amendment_id,
        cim_or_cpo=cim_or_cpo,
        due_date_period_months=due_date_period_months or 0,
        initial_due_date=initial_due_date,
        ministry_recipient=None,  # Adjust as needed
    )

    return mine_report_permit_requirement

def _determine_parent(condition: PermitConditionResult, last_condition_id_by_number_structure) -> Optional[PermitConditionResult]:
    """
    Determine the parent ID based on the hierarchy.

    Example:
    - If the hierarchy is ['A', '1', 'a', 'i', ''], the parent is the condition with the hierarchy ['A', '1', 'a', '', '']
    """
    number_structure = condition.numbering_structure
    parent_number_structure = [item for item in number_structure if item][:-1]

    if len(parent_number_structure) < len(number_structure):
        parent_number_structure += [''] * (len(number_structure) - len(parent_number_structure))

    parent_key = ".".join(parent_number_structure)

    parent = last_condition_id_by_number_structure.get(parent_key)
    return parent

def _create_permit_condition_category(condition: PermitConditionResult, permit_amendment: PermitAmendment, display_order: int, step: str) -> Optional[str]:
    """
    Finds the matching PermitConditionCategory code for the given condition based on the title or text it contains.

    If the condition title or text contains the category description (with a >0.6 ratio), it is considered a match

    TODO:
        - This is just in place to get something working that will map Major Mine categories to existing
            regional mine permit categories. This will need to be updated to be more robust and flexible.
        - The 0.6 ratio is just to cover cases where the condition text is not an exact match to the category description.
            For example this will map the "Protection of Land and Watercourses" Major Mine category to the existing "Environmental Land and Watercourses" category.

    Args:
        condition_categories: List of PermitConditionCategory objects
        condition: Condition object
        
    """

    text = condition.condition_title if condition.condition_title else condition.condition_text

    cat = PermitConditionCategory.create(
        condition_category_code=str(uuid.uuid4()),
        description=text,
        display_order=display_order,
        permit_amendment_id=permit_amendment.permit_amendment_id,
        step=step
    )

    return cat.condition_category_code

    
