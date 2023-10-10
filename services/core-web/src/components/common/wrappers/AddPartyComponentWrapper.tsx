import React, { FC, useEffect, useState } from "react";
import { connect } from "react-redux";
import { Radio, Divider } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
// Ant design Carousel is based on react-slick and kind of sucks. Tabbing breaks it, dynamically rendering content breaks it,
// and you need to use Refs to interact with it for a number of features. Brought in react-responsive-carousel instead.
import { Carousel } from "react-responsive-carousel";
import "react-responsive-carousel/lib/styles/carousel.min.css";
import { createParty, setAddPartyFormState } from "@common/actionCreators/partiesActionCreator";
import { getAddPartyFormState } from "@common/selectors/partiesSelectors";
import AddQuickPartyForm from "@/components/Forms/parties/AddQuickPartyForm";
import { getDropdownProvinceOptions } from "@common/selectors/staticContentSelectors";
import LinkButton from "../buttons/LinkButton";
import { ICreateParty, IParty, IAddPartyFormState, IOption } from "@mds/common";
import { AxiosResponse } from "axios";

const defaultAddPartyFormState = {
  showingAddPartyForm: false,
  person: true,
  organization: true,
  partyLabel: "contact",
};

interface AddPartyComponentWrapperProps {
  childProps: any;
  content: any; //PropTypes.func,
  clearOnSubmit: boolean;
  closeModal: () => void;
  createParty: (payload: ICreateParty) => Promise<AxiosResponse<IParty>>;
  setAddPartyFormState: (formState: IAddPartyFormState) => IAddPartyFormState;
  // addPartyFormState is selected from the partiesReducer
  addPartyFormState: IAddPartyFormState;
  initialValues: any; //PropTypes.objectOf(PropTypes.any),
  provinceOptions: IOption[];
}

export const AddPartyComponentWrapper: FC<AddPartyComponentWrapperProps> = ({
  childProps = { title: "" },
  closeModal = () => {},
  content = () => {},
  initialValues = {},
  addPartyFormState,
  ...props
}) => {
  const [isPerson, setIsPerson] = useState(true);
  const [addingParty, setAddingParty] = useState(false);

  const resetAddPartyForm = () => {
    props.setAddPartyFormState({
      ...addPartyFormState,
      ...defaultAddPartyFormState,
    });
  };

  const showAddPartyForm = () => {
    // If focus remains active in the parent form, Carousel behavior breaks.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setAddingParty(true);
  };
  const hideAddPartyForm = () => {
    // If focus remains active in the party form, Carousel behavior breaks.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setAddingParty(false);
  };
  const togglePartyChange = (value) => {
    setIsPerson(value.target.value);
  };

  const handlePartySubmit = async (values) => {
    const party_type_code = isPerson ? "PER" : "ORG";
    const payload = { party_type_code, ...values };

    props
      .createParty(payload)
      .then(() => {
        resetAddPartyForm();
      })
      .catch();
  };

  useEffect(() => {
    resetAddPartyForm();
  }, []);

  useEffect(() => {
    if (addPartyFormState.showingAddPartyForm) {
      showAddPartyForm();
    } else {
      hideAddPartyForm();
    }
  }, [addPartyFormState.showingAddPartyForm]);

  const renderAddParty = () => (
    <div>
      <h2>Add new {addPartyFormState.partyLabel}</h2>
      <LinkButton onClick={resetAddPartyForm}>
        <ArrowLeftOutlined className="padding-sm--right" />
        Back to: {childProps.title}
      </LinkButton>
      <Divider />
      <div className="center">
        {addPartyFormState.person && addPartyFormState.organization && (
          <Radio.Group
            defaultValue
            size="large"
            value={isPerson}
            onChange={togglePartyChange}
            style={{ paddingBottom: "20px" }}
          >
            <Radio.Button value>Person</Radio.Button>
            <Radio.Button value={false}>Organization</Radio.Button>
          </Radio.Group>
        )}
        <AddQuickPartyForm
          onSubmit={handlePartySubmit}
          isPerson={isPerson}
          provinceOptions={props.provinceOptions}
        />
      </div>
    </div>
  );

  const ChildComponent = content;

  return (
    <div>
      <Carousel
        selectedItem={addingParty ? 1 : 0}
        showArrows={false}
        showStatus={false}
        showIndicators={false}
        showThumbs={false}
        swipeable={false}
      >
        {/* Set original form to display:none to preserve its state, while not allowing any interaction such as tabbing to the hidden form. */}
        <div style={addingParty ? { display: "none" } : {}}>
          {ChildComponent && (
            <div className="fade-in">
              <ChildComponent
                closeModal={closeModal}
                clearOnSubmit={props.clearOnSubmit}
                {...childProps}
              />
            </div>
          )}
        </div>
        <div>{addingParty && renderAddParty()}</div>
      </Carousel>
    </div>
  );
};

const mapStateToProps = (state) => ({
  addPartyFormState: getAddPartyFormState(state),
  provinceOptions: getDropdownProvinceOptions(state),
});

const mapDispatchToProps = {
  createParty,
  setAddPartyFormState,
};

export default connect(mapStateToProps, mapDispatchToProps)(AddPartyComponentWrapper);
