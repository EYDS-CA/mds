-- This file was generated by the generate_table_ddl command
-- The file contains the corresponding history table definition for the permit_extraction_task table
CREATE TABLE permit_extraction_task (
	create_user VARCHAR(60) NOT NULL, 
	create_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	update_user VARCHAR(60) NOT NULL, 
	update_timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
	permit_extraction_task_id UUID NOT NULL, 
	task_id VARCHAR(255) NOT NULL, 
	task_status VARCHAR(255) NOT NULL, 
	task_meta JSON, 
	task_result JSON, 
	core_status_task_id VARCHAR(255), 
	permit_amendment_guid UUID NOT NULL, 
	permit_amendment_document_guid UUID NOT NULL, 
	PRIMARY KEY (permit_extraction_task_id), 
	FOREIGN KEY(permit_amendment_guid) REFERENCES permit_amendment (permit_amendment_guid), 
	FOREIGN KEY(permit_amendment_document_guid) REFERENCES permit_amendment_document (permit_amendment_document_guid)
);
CREATE INDEX IF NOT EXISTS permit_extraction_task_id_idx ON permit_extraction_task (task_id);
CREATE INDEX IF NOT EXISTS permit_extraction_amend_guid_idx ON permit_extraction_task (permit_amendment_guid);