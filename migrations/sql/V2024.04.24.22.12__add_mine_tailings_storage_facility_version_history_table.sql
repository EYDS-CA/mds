-- This file was generated by the generate_history_table_ddl command
-- The file contains the corresponding history table definition for the {table} table
CREATE TABLE mine_tailings_storage_facility_version (
	create_user VARCHAR(60), 
	create_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	update_user VARCHAR(60), 
	update_timestamp TIMESTAMP WITHOUT TIME ZONE, 
	mine_tailings_storage_facility_guid UUID NOT NULL, 
	mine_guid UUID, 
	mine_tailings_storage_facility_name VARCHAR(60), 
	latitude NUMERIC(9, 7), 
	longitude NUMERIC(11, 7), 
	consequence_classification_status_code VARCHAR, 
	itrb_exemption_status_code VARCHAR, 
	tsf_operating_status_code VARCHAR, 
	notes VARCHAR, 
	storage_location storage_location, 
	facility_type facility_type, 
	tailings_storage_facility_type tailings_storage_facility_type, 
	mines_act_permit_no VARCHAR(50), 
	transaction_id BIGINT NOT NULL, 
	end_transaction_id BIGINT, 
	operation_type SMALLINT NOT NULL, 
	PRIMARY KEY (mine_tailings_storage_facility_guid, transaction_id)
);
CREATE INDEX ix_mine_tailings_storage_facility_version_operation_type ON mine_tailings_storage_facility_version (operation_type);
CREATE INDEX ix_mine_tailings_storage_facility_version_end_transaction_id ON mine_tailings_storage_facility_version (end_transaction_id);
CREATE INDEX ix_mine_tailings_storage_facility_version_transaction_id ON mine_tailings_storage_facility_version (transaction_id);
