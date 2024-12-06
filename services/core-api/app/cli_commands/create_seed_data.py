from app.extensions import db
from flask import current_app
from flask.cli import with_appcontext
from sqlalchemy.inspection import inspect
from tests.factories import get_factory_class


@with_appcontext
def create_factory_record(model_name, params):
    """Create a database record using the specified factory.
    
    Example usage:
    flask create-factory-record Mine --mine_name="Test Mine" --mine_no="BC12345"
    """

    try:
        # Get the factory class
        factory_class = get_factory_class(model_name)
        if not factory_class:
            raise Exception(f"No factory found for model {model_name}")

        # Create the record using the factory
        record = factory_class(**params)
        db.session.commit()

        current_app.logger.info(f"Successfully created {model_name} record")

        insp = inspect(record.__class__)

        current_app.logger.info(str(record))
        if insp and insp.primary_key:
            for pk in insp.primary_key:
                current_app.logger.info(f"{pk.name}: {getattr(record, pk.name)}")
    except:
        db.session.rollback()
        raise
