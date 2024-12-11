import logging
import os
from typing import List, Optional

from app.permit_conditions.pipelines.chat_data import ChatData
from app.permit_conditions.validator.permit_condition_model import (
    PermitCondition,
    PermitConditions,
)
from haystack import Document, component
from haystack.components.builders import ChatPromptBuilder

logger = logging.getLogger(__name__)
DEBUG_MODE = os.environ.get("DEBUG_MODE", "False").lower() == "true"


@component
class PaginatedChatPromptBuilder(ChatPromptBuilder):
    """
    Component that renders chat prompts using Jinja templates for the use
    in further steps of the pipeline.

    This component extends the ChatPromptBuilder component to support pagination of the chat prompts
    """

    @component.output_types(data=ChatData)
    def run(
        self,
        conditions: PermitConditions,
        iteration: Optional[dict] = None,
        template=None,
        template_variables=None,
        **kwargs,
    ):
        
        if not template_variables:
            template_variables = {}
        if iteration:
            logger.info(
                f"Processing pages starting from page {iteration['start_page']}"
            )
            # Merge "iteration" variables with the template variables
            # the iteration variable input contain the variables that are specific to the pagination we do
            # (start_page, last_condition_text)
            template_variables = {**template_variables, **iteration}
        else:
            logger.info("Processing pages starting from page 0")

        # Split conditions into groups
        grouped_conditions = self.split_conditions(conditions.conditions)

        prompts = []
        for idx, group in enumerate(grouped_conditions):
            template_variables['documents'] = _format_condition_text_for_prompt(group)
            output = super(PaginatedChatPromptBuilder, self).run(
                template=template, template_variables=template_variables, **kwargs
            )
            prompts.append(output["prompt"])

            if DEBUG_MODE:
                with open(f"debug/paginated_chat_puilder_output_{idx + 1}.txt", "a") as f:
                    for prompt in output["prompt"]:
                        f.write(prompt.content + "\n\n")

        return {"data": ChatData(prompts, kwargs["documents"])}

    def split_conditions(self, conditions: List[PermitCondition]) -> List[List[PermitCondition]]:
        grouped_conditions = []
        current_group = []
        current_section = None
        current_subsection = None

        for condition in conditions:
            if condition.section != current_section:
                if current_group:
                    grouped_conditions.append(current_group)
                    current_group = []
                current_section = condition.section
                current_subsection = condition.paragraph
            elif condition.paragraph != current_subsection and len(current_group) >= 30:
                grouped_conditions.append(current_group)
                current_group = []
                current_subsection = condition.paragraph

            current_group.append(condition)

        if current_group:
            grouped_conditions.append(current_group)

        return grouped_conditions

def _format_condition_text_for_prompt(conditions: List[PermitCondition]) -> List[Document]:
    # Format the conditions for the prompt including the condition text and the condition id, indenting the text based on the section, paragraph, etc.
    # A. General (id: abc123)
    #    1. This is a test. (id: 123)
    #       a)  This is another test. (id: 456)
    repr = "\n".join([f"{c.formatted_text} (id: {c.id})" for c in conditions])
    return [Document(content=repr)]
