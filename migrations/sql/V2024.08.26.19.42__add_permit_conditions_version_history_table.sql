-- This file was generated by the generate_history_table_ddl command
-- The file contains the corresponding history table definition for the {table} table
CREATE TABLE permit_conditions_version (
	create_user VARCHAR(60), 
	create_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	update_user VARCHAR(60), 
	update_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	deleted_ind BOOLEAN, 
	permit_condition_id INTEGER NOT NULL, 
	permit_amendment_id INTEGER, 
	permit_condition_guid UUID, 
	condition VARCHAR, 
	condition_category_code VARCHAR, 
	condition_type_code VARCHAR, 
	parent_permit_condition_id INTEGER, 
	display_order INTEGER, 
	transaction_id BIGINT NOT NULL, 
	end_transaction_id BIGINT, 
	operation_type SMALLINT NOT NULL, 
	PRIMARY KEY (permit_condition_id, transaction_id)
);
CREATE INDEX ix_permit_conditions_version_end_transaction_id ON permit_conditions_version (end_transaction_id);
CREATE INDEX ix_permit_conditions_version_operation_type ON permit_conditions_version (operation_type);
CREATE INDEX ix_permit_conditions_version_transaction_id ON permit_conditions_version (transaction_id);
