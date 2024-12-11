import json
import os
from unittest.mock import MagicMock

import pytest
from app.permit_conditions.converters.metadata_converter import (
    ConditionsMetadataCombiner,
)
from app.permit_conditions.pipelines.chat_data import ChatData
from app.permit_conditions.tasks.tasks import task_context
from app.permit_conditions.validator.permit_condition_model import (
    PermitCondition,
    PermitConditions,
)
from haystack import Document
from haystack.dataclasses import ChatMessage
from tests.mocks import MockContext

logger = MagicMock()


@pytest.fixture(scope="session", autouse=True)
def set_env():
    os.environ["DEBUG_MODE"] = "true"


def test_conditions_metadata_combiner():
    conditions = PermitConditions(conditions=[
        PermitCondition(id="abc123", text="condition 1", meta={'bounding_box': {'top': 1}}),
        PermitCondition(id="abc234", text="condition 2", meta={'bounding_box': {'top': 2}}),
    ])
    data = ChatData(messages=[[
        ChatMessage.from_system(content=json.dumps({"paragraphs": [{"id": "abc123", "meta": {"question": "Answer 1"}}, {"id": "abc234", "meta": {"question": "Answer 2"}}]}))
    ]], documents=[])

    with task_context(MockContext()):
        combiner = ConditionsMetadataCombiner()

        result = combiner.run(conditions=conditions, data=data)
    result_conditions = result["conditions"].conditions
    assert len(result_conditions) == 2
    assert result_conditions[0].meta["questions"] == {"question": "Answer 1"}
    assert result_conditions[1].meta["questions"] == {"question": "Answer 2"}
    assert result_conditions[0].meta["bounding_box"] == {'top': 1}
    assert result_conditions[1].meta["bounding_box"] == {'top': 2}

def test_conditions_metadata_combiner_with_multiple_message_groups():
    conditions = PermitConditions(conditions=[
        PermitCondition(id="abc123", text="condition 1", meta={'bounding_box': {'top': 1}}),
        PermitCondition(id="abc234", text="condition 2", meta={'bounding_box': {'top': 2}}),
    ])
    data = ChatData(messages=[
        [
            ChatMessage.from_system(content=json.dumps({"paragraphs": [{"id": "abc123", "meta": {"question": "Answer 1"}}]})),
        ],
        [
            ChatMessage.from_system(content=json.dumps({"paragraphs": [{"id": "abc234", "meta": {"question": "Answer 2", "category": "Important"}}]})),
        ]
    ], documents=[])

    with task_context(MockContext()):
        combiner = ConditionsMetadataCombiner()
        result = combiner.run(conditions=conditions, data=data)

    result_conditions = result["conditions"].conditions
    assert len(result_conditions) == 2
    assert result_conditions[0].meta["questions"] == {"question": "Answer 1"}
    assert result_conditions[1].meta["questions"] == {"question": "Answer 2", "category": "Important"}
    assert result_conditions[0].meta["bounding_box"] == {'top': 1}
    assert result_conditions[1].meta["bounding_box"] == {'top': 2}
