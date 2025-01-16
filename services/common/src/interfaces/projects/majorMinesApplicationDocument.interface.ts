import { IMineDocument } from "@mds/common/interfaces";

export interface IMajorMinesApplicationDocument extends IMineDocument {
  major_mine_application_id: number;
  major_mine_application_document_type_code: string;
}
