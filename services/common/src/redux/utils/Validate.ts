import * as Strings from "@mds/common/constants/strings";
import { IOption } from "@mds/common/interfaces/";

import { memoize } from "lodash";
import moment from "moment-timezone";

/**
 * Utility class for validating inputs using redux forms
 */
class Validator {
  // eslint-disable-next-line no-control-regex
  ASCII_REGEX = /^[\x00-\x7F\s]*$/;

  CAN_POSTAL_CODE_REGEX = /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$/;

  US_POSTAL_CODE_REGEX = /(^\d{5}$)|(^\d{9}$)|(^\d{5}-\d{4}$)/;

  EMAIL_REGEX = /^[a-zA-Z0-9`'’._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

  PHONE_REGEX = /^[0-9]{3}-[0-9]{3}-[0-9]{4}$/i;

  NAME_REGEX = /^[A-Za-zÀ-ÿ'\-\s']+$/;

  FLOATS_REGEX = /^-?\d*(\.{1}\d+)?$/;

  NUMBERS_OR_EMPTY_STRING_REGEX = /^-?\d*\.?\d*$/;

  URL_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/;

  LAT_REGEX = /^(\+|-)?(?:90(?:(?:\.0{1,7})?)|(?:[0-9]|[1-8][0-9])(?:(?:\.[0-9]{1,7})?))$/;

  LON_REGEX = /^(\+|-)?(?:180(?:(?:\.0{1,7})?)|(?:[0-9]|[1-9][0-9]|1[0-7][0-9])(?:(?:\.[0-9]{1,7})?))$/;

  CURRENCY_REGEX = /^-?\d{1,12}(?:\.\d{0,2})?$/;

  PROTOCOL_REGEX = /^https?:\/\/(.*)$/;

  LON_NEGATIVE = /^-\d*\.?\d+$/;

  WHOLE_NUMBER_REGEX = /^\d*$/;

  checkLat(lat) {
    return this.LAT_REGEX.test(lat);
  }

  checkLon(lon) {
    return this.LON_REGEX.test(lon);
  }

  checkLonNegative(lon) {
    return this.LON_NEGATIVE.test(lon);
  }

  checkPhone(number) {
    return this.PHONE_REGEX.test(number);
  }

  checkEmail(email) {
    return this.EMAIL_REGEX.test(email);
  }

  checkPostalCode(code, country = "CAN") {
    if (country === "USA") {
      return this.US_POSTAL_CODE_REGEX.test(code);
    }
    return this.CAN_POSTAL_CODE_REGEX.test(code);
  }

  checkCurrency(number) {
    return this.CURRENCY_REGEX.test(number);
  }

  checkProtocol(url) {
    return this.PROTOCOL_REGEX.test(url);
  }

  checkWholeNumber(url) {
    return this.WHOLE_NUMBER_REGEX.test(url);
  }
}

export const Validate = new Validator();

export const required = (value) => (value || value === 0 ? undefined : "This is a required field");

export const requiredRadioButton = (value) =>
  value !== null && value !== undefined ? undefined : "This is a required field";

export const requiredNotUndefined = (value) =>
  value !== undefined ? undefined : "This is a required field";

export const requiredList = (value) =>
  value && value.length > 0 ? undefined : "This is a required field";

export const requiredNewFiles = (files: any[]) => {
  const hasNewFiles =
    files && files.some((file) => file.document_manager_guid && !file.mine_document_guid);
  return hasNewFiles ? undefined : "This is a required field";
};

export const spatialDocumentBundle = (files: any[]) => {
  const singleTypes = ["kml", "kmz"];
  const mandatoryTypes = ["shp", "shx", "dbf", "prj"];
  const optionalTypes = ["sbn", "sbx", "xml"];
  const errors = [];

  if (files?.length > 0) {
    const fileData = files.map((file) => file.document_name.split("."));
    const filesMultipleTypes = fileData.filter((data) => data.length > 2);
    if (filesMultipleTypes.length > 0) {
      const invalidFiles = filesMultipleTypes.map((file) => file.join("."));
      errors.push(`Invalid file types: ${invalidFiles.join(", ")}`);
    }
    const isSingleFile = files.length === 1 && singleTypes.includes(fileData[0][1].toLowerCase());
    if (isSingleFile && errors.length === 0) {
      return;
    }
    const fileNameToCompare = fileData[0][0];
    const fileNameMatch = fileData.every(([fileName]) => fileName === fileNameToCompare);
    if (!fileNameMatch) {
      return "Spatial document file names must match";
    }

    const getMatching = (fileType) =>
      fileData.filter(([_name, type]) => type.toLowerCase() === fileType);
    const missingRequired = [];
    const duplicateTypes = [];
    mandatoryTypes.forEach((fileType) => {
      const matching = getMatching(fileType);
      if (matching.length === 0) {
        missingRequired.push(fileType);
      }
      if (matching.length > 1) {
        duplicateTypes.push(fileType);
      }
    });
    optionalTypes.forEach((fileType) => {
      const matching = getMatching(fileType);
      if (matching.length > 1) {
        duplicateTypes.push(fileType);
      }
    });
    if (missingRequired.length > 0) {
      errors.push(`Spatial bundle is missing file types: ${missingRequired.join(", ")}`);
    }
    if (duplicateTypes.length > 0) {
      errors.push(
        `Spatial bundle can only have one instance of each type: ${duplicateTypes.join(", ")}`
      );
    }
  }
  return errors.length > 0 ? errors.join("\n") : undefined;
};

export const notnone = (value) => (value === "None" ? "Please select an item" : undefined);

export const maxLength = memoize((max) => (value) =>
  value && value.length > max ? `Must be ${max} characters or less` : undefined
);

export const minLength = memoize((min) => (value) =>
  value && value.length < min ? `Must be ${min} characters or more` : undefined
);

export const exactLength = memoize((min) => (value) =>
  value && value.length !== min ? `Must be ${min} characters long` : undefined
);

export const number = (value) =>
  value && Number.isNaN(Number(value)) ? "Input must be a number" : undefined;

export const digitCharactersOnly = (value) => {
  return value && !/^\d+$/.test(value) ? "Input must contain only digits" : undefined;
};

export const positiveNumber = (value) =>
  value && (Number.isNaN(Number(value)) || Number(value) <= 0)
    ? "Input must be a positive number"
    : undefined;

export const date = (value) =>
  value && Number.isNaN(Date.parse(value)) ? "Input must be a date" : undefined;

// Redux Forms 'Fields' component accepts an array of Field names, and applies the validation to both field inputs,
// The raw input should be a number, the unit code comes from a dropdown and should be ignored
export const numberWithUnitCode = (value) => {
  const isUnitCode = value && value.length <= 3 && value === value.toUpperCase();
  return value && !isUnitCode && Number.isNaN(Number(value)) ? "Input must be a number" : undefined;
};

export const lat = (value) =>
  value && !Validate.checkLat(value) ? "Invalid latitude coordinate e.g. 53.7267" : undefined;

export const lon = (value) =>
  value && !Validate.checkLon(value) ? "Invalid longitude coordinate e.g. -127.6476000" : undefined;

export const lonNegative = (value) =>
  value && !Validate.checkLonNegative(value)
    ? "Invalid longitude - must be a negative number"
    : undefined;

export const phoneNumber = (value) =>
  value && !Validate.checkPhone(value) ? "Invalid phone number e.g. xxx-xxx-xxxx" : undefined;

// relies on provinceOptions being passed as props rather than through a selector
export const postalCode = (value, allValues, formProps) => {
  const { sub_division_code } = allValues;
  const country = formProps.provinceOptions.find((prov) => prov.value === sub_division_code)
    ?.subType;
  return value && !Validate.checkPostalCode(value, country)
    ? "Invalid postal code or zip code"
    : undefined;
};

export const postalCodeWithCountry = memoize((address_type_code = "CAN") => (value) => {
  const code_type = address_type_code === "USA" ? "zip code" : "postal code";
  if (!["CAN", "USA"].includes(address_type_code)) {
    return undefined;
  }
  return value && !Validate.checkPostalCode(value, address_type_code)
    ? `Invalid ${code_type}`
    : undefined;
});

export const protocol = (value) =>
  value && !Validate.checkProtocol(value) ? "Invalid. Url must contain https://" : undefined;

export const email = (value) =>
  value && !Validate.checkEmail(value) ? "Invalid email address" : undefined;

export const currency = (value) =>
  value && !Validate.checkCurrency(value) ? "Invalid dollar amount" : undefined;

export const validSearchSelection = ({ key, err }) => (value, allValues, formProps) =>
  !Object.keys(formProps[key]).includes(value) ? err || "Invalid Selection" : undefined;

export const validateStartDate = memoize((previousStartDate) => (value) =>
  value <= previousStartDate
    ? "New manager's start date cannot be on or before the previous manager's start date."
    : undefined
);

export const alertStartDateNotBeforeHistoric = memoize((mineAlerts) => (value) => {
  const isBefore = mineAlerts.some((alert) => new Date(value) < new Date(alert.start_date));
  return isBefore
    ? `Start date cannot come before a historic alert. Please check history for more details.`
    : undefined;
});

export const min = memoize((minValue) => (value) =>
  value && value < minValue ? `Must be at least ${minValue}` : undefined
);

export const max = memoize((maxValue) => (value) =>
  value && value > maxValue ? `Must be ${maxValue} or less` : undefined
);

export const alertNotInFutureIfCurrentActive = memoize((mineAlert) => (value) =>
  value && mineAlert.start_date && new Date(value) >= new Date()
    ? "Start date cannot be in the future if there is a current active alert.  Please update or remove current alert first"
    : undefined
);

export const dateNotInFuture = (value) =>
  value && new Date(value) >= new Date() ? "Date cannot be in the future" : undefined;

export const dateNotInFutureTZ = (value) => {
  return value && !moment(value).isBefore() ? "Date cannot be in the future" : undefined;
};

export const dateTimezoneRequired = memoize((timezoneField) => (_value, allValues) => {
  const formTimezone = allValues[timezoneField];
  return formTimezone && formTimezone.length > 0 ? undefined : "Please select a timezone";
});

export const dateInFuture = (value) =>
  value && !moment(value).isAfter() ? "Date must be in the future" : undefined;

// NOTE: modified from version in CORE- change from <= to <
export const dateNotBeforeOther = memoize((other: string, otherLabel?: string) => (value: string) => {
  const invalid = value && other && value < other;
  if (!invalid) {
    return undefined;
  }
  const otherFormattedDate = moment(other).format("ddd MMM D YYYY");
  const otherDateText = otherLabel ? `${otherLabel} (${otherFormattedDate})` : otherFormattedDate;
  return `Date cannot be before ${otherDateText}`
}, (other, otherLabel) => `${other}_${otherLabel}`);

export const dateNotBeforeStrictOther = memoize((other) => (value) =>
  value && other && moment(value).isBefore(other) ? `Date cannot be before ${other}` : undefined
);

export const timeNotBeforeOther = memoize(
  (comparableDate, baseDate, baseTime) => (comparableTime) =>
    baseTime &&
      baseDate &&
      comparableDate &&
      comparableTime &&
      baseDate === comparableDate &&
      comparableTime < baseTime
      ? `Time cannot be before ${baseTime.format("H:mm")} hrs.`
      : undefined
);

// NOTE: modified from version in CORE- change from >= to >
export const dateNotAfterOther = memoize((other: string, otherLabel?: string) => (value: string) => {
  const invalid = value && other && value > other;
  if (!invalid) {
    return undefined;
  }
  const otherFormattedDate = moment(other).format("ddd MMM D YYYY");
  const otherDateText = otherLabel ? `${otherLabel} (${otherFormattedDate})` : otherFormattedDate;

  return `Date cannot be after ${otherDateText}`
}, (other, otherLabel) => `${other}_${otherLabel}`);

export const yearNotInFuture = (value) =>
  value && value > new Date().getFullYear() ? "Year cannot be in the future" : undefined;

export const validateIncidentDate = memoize((reportedDate) => (value) =>
  value <= reportedDate
    ? "Incident date and time cannot occur before reporting occurence."
    : undefined
);

/**
 * @param data: options to choose from
 * @param allowEmptyData: perform validation with empty data array (free text on empty data set will be invalid)
 */
export const validateSelectOptions = memoize((data: IOption[], allowEmptyData = false) => (value):
  | string
  | undefined => {
  if (value && (data?.length > 0 || allowEmptyData)) {
    return data?.find((opt) => opt.value === value) !== undefined
      ? undefined
      : "Invalid. Select an option provided in the dropdown.";
  }
  return undefined;
});

export const decimalPlaces = memoize((places) => (value) => {
  if (value && !Validate.checkWholeNumber(value)) {
    const valueDecimalPlaces = value.split(".")[1];
    return valueDecimalPlaces && valueDecimalPlaces.length > places
      ? `Must be ${places} decimal places or less`
      : undefined;
  }
  return undefined;
});

export const maxDigits = memoize((digits) => (value) => {
  if (value) {
    const valueDigits = value.toString().includes(".")
      ? value.toString().split(".")[0]
      : value.toString();
    return valueDigits && valueDigits.length > digits
      ? `Must be ${digits} digits or less`
      : undefined;
  }
  return undefined;
});

export const wholeNumber = (value) =>
  value && !Validate.checkWholeNumber(value)
    ? "Invalid. The number must be a whole number, decimals not allowed."
    : undefined;

export const validateDateRanges = (
  existingAppointments,
  newAppt,
  apptType,
  isCurrentAppointment
) => {
  const errorMessages: any = {};
  const toDate = (dateString) => (dateString ? moment(dateString, "YYYY-MM-DD").toDate() : null);
  const MAX_DATE = new Date(8640000000000000);
  const MIN_DATE = new Date(-8640000000000000);

  if (existingAppointments.length === 0) {
    return errorMessages;
  }

  const dateAppointments = existingAppointments.map((appt) => {
    const appointment = { ...appt };
    appointment.start_date = appt.start_date ? toDate(appt.start_date) : MIN_DATE;
    appointment.end_date = appt.end_date ? toDate(appt.end_date) : MAX_DATE;
    return appointment;
  });

  const newDateAppt = { ...newAppt };
  newDateAppt.start_date = newDateAppt.start_date ? toDate(newDateAppt.start_date) : MIN_DATE;
  newDateAppt.end_date = newDateAppt.end_date ? toDate(newDateAppt.end_date) : MAX_DATE;
  let conflictingAppointments;

  if (isCurrentAppointment) {
    conflictingAppointments = dateAppointments.filter(
      (appt) => newDateAppt.start_date <= appt.start_date
    );
  } else {
    // If (NewApptEnd >= ApptStart) and (NewApptStart <= ApptEnd) ; “Overlap”)
    conflictingAppointments = dateAppointments.filter(
      (appt) => newDateAppt.end_date >= appt.start_date && newDateAppt.start_date <= appt.end_date
    );
  }
  if (conflictingAppointments.length > 0) {
    const conflictMsg = `Assignment conflicts with existing ${apptType}: ${conflictingAppointments
      .map((appt) => appt.party.name)
      .join()}`;
    errorMessages.start_date = conflictMsg;
    errorMessages.end_date = conflictMsg;
  }

  return errorMessages;
};

export const requiredBoolean = (value) =>
  value || value === false ? undefined : "This is a required field";

export const validateIfApplicationTypeCorrespondsToPermitNumber = (
  applicationType,
  permit,
  isAdminAmendment
) => {
  if (permit && applicationType) {
    return permit?.permit_prefix &&
      Strings.APPLICATION_TYPES_BY_PERMIT_PREFIX[permit.permit_prefix].includes(applicationType)
      ? undefined
      : `The ${isAdminAmendment ? "Type of Administrative Amendment" : "Type of Notice of Work"
      } does not match to the selected permit.`;
  }
  return undefined;
};
