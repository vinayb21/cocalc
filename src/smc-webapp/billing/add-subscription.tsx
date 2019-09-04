import {
  Alert,
  Button,
  ButtonGroup,
  ButtonToolbar,
  Col,
  Row,
  Well
} from "react-bootstrap";
import { Icon } from "../r_misc/icon";
import { PROJECT_UPGRADES } from "smc-util/schema";
import { capitalize } from "smc-util/misc2";
import { Component, React, Rendered, redux } from "../app-framework";
import { AppliedCoupons, Customer } from "./types";
import { ConfirmPaymentMethod } from "./confirm-payment-method";
import { powered_by_stripe } from "./util";

interface Props {
  on_close: Function;
  selected_plan: string;
  applied_coupons: AppliedCoupons;
  coupon_error?: string;
  customer?: Customer;
}

interface State {
  selected_button: "month" | "week" | "year" | "year1" | "month4";
}

export class AddSubscription extends Component<Props, State> {
  constructor(props, state) {
    super(props, state);
    this.state = { selected_button: "month" };
  }

  static get defaultProps() {
    return { selected_plan: "" };
  }

  private is_recurring(): boolean {
    const sub =
      PROJECT_UPGRADES.subscription[this.props.selected_plan.split("-")[0]];
    if (sub == null) return false; // shouldn't happen
    return !sub.cancel_at_period_end;
  }

  private submit_create_subscription(): void {
    const actions = redux.getActions("billing");
    if (actions == null) return;
    actions.create_subscription(this.props.selected_plan);
  }

  private set_button_and_deselect_plans(button): void {
    if (this.state.selected_button !== button) {
      const actions = redux.getActions("billing");
      if (actions == null) return;
      actions.set_selected_plan("");
      this.setState({ selected_button: button });
    }
  }

  private render_period_selection_buttons(): Rendered {
    return (
      <div>
        <ButtonGroup
          bsSize="large"
          style={{ marginBottom: "20px", display: "flex" }}
        >
          <Button
            bsStyle={
              this.state.selected_button === "month" ? "primary" : undefined
            }
            onClick={() => this.set_button_and_deselect_plans("month")}
          >
            Monthly Subscriptions
          </Button>
          <Button
            bsStyle={
              this.state.selected_button === "year" ? "primary" : undefined
            }
            onClick={() => this.set_button_and_deselect_plans("year")}
          >
            Yearly Subscriptions
          </Button>
          <Button
            bsStyle={
              this.state.selected_button === "week" ? "primary" : undefined
            }
            onClick={() => this.set_button_and_deselect_plans("week")}
          >
            1-Week Workshops
          </Button>
          <Button
            bsStyle={
              this.state.selected_button === "month4" ? "primary" : undefined
            }
            onClick={() => this.set_button_and_deselect_plans("month4")}
          >
            4-Month Courses
          </Button>
          <Button
            bsStyle={
              this.state.selected_button === "year1" ? "primary" : undefined
            }
            onClick={() => this.set_button_and_deselect_plans("year1")}
          >
            Yearly Courses
          </Button>
        </ButtonGroup>
      </div>
    );
  }

  private render_renewal_info(): Rendered {
    if (this.props.selected_plan) {
      const renews = !PROJECT_UPGRADES.subscription[
        this.props.selected_plan.split("-")[0]
      ].cancel_at_period_end;
      const length = PROJECT_UPGRADES.period_names[this.state.selected_button];
      return (
        <p style={{ marginBottom: "1ex", marginTop: "1ex" }}>
          {renews ? (
            <span>
              This subscription will <b>automatically renew</b> every {length}.
              You can cancel automatic renewal at any time.
            </span>
          ) : (
            undefined
          )}
          {!renews ? (
            <span>
              You will be <b>charged only once</b> for the course package, which
              lasts {length === "year" ? "a " : undefined}
              {length}. It does <b>not automatically renew</b>.
            </span>
          ) : (
            undefined
          )}
        </p>
      );
    }
  }

  private render_subscription_grid(): Rendered {
    const { SubscriptionGrid } = require("../billing");
    return (
      <SubscriptionGrid
        period={this.state.selected_button}
        selected_plan={this.props.selected_plan}
      />
    );
  }

  /*private render_dedicated_resources(): Rendered {
    const { ExplainResources } = require("../billing");
    return (
      <div style={{ marginBottom: "15px" }}>
        <ExplainResources type="dedicated" />
      </div>
    );
  }*/

  private render_create_subscription_options(): Rendered {
    // <h3><Icon name='list-alt'/> Sign up for a Subscription</h3>
    return (
      <div>
        <div style={{ textAlign: "center" }}>
          {this.render_period_selection_buttons()}
        </div>
        {this.render_subscription_grid()}
      </div>
    );
  }

  private render_create_subscription_confirm(plan_data): Rendered {
    let subscription;
    if (this.is_recurring()) {
      subscription = " and you will be signed up for a recurring subscription";
    }
    const name =
      plan_data.desc != null
        ? plan_data.desc
        : capitalize(this.props.selected_plan).replace(/_/g, " ") + " plan";
    return (
      <Alert>
        <h4>
          <Icon name="check" /> Confirm your selection{" "}
        </h4>
        <p>
          You have selected a{" "}
          <span style={{ fontWeight: "bold" }}>{name} subscription</span>.
        </p>
        {this.render_renewal_info()}
        <p>
          By clicking 'Add Subscription or Course Package' below, your payment
          card will be immediately charged{subscription}.
        </p>
      </Alert>
    );
  }

  private render_create_subscription_buttons(): Rendered {
    return (
      <Row>
        <Col sm={4}>{powered_by_stripe()}</Col>
        <Col sm={8}>
          <ButtonToolbar className="pull-right">
            <Button
              bsStyle="primary"
              bsSize="large"
              onClick={() => (
                this.submit_create_subscription(), this.props.on_close()
              )}
              disabled={this.props.selected_plan === ""}
            >
              <Icon name="check" /> Add Subscription or Course Package
            </Button>
            <Button onClick={() => this.props.on_close()} bsSize="large">
              Cancel
            </Button>
          </ButtonToolbar>
        </Col>
      </Row>
    );
  }

  render() {
    const plan_data =
      PROJECT_UPGRADES.subscription[this.props.selected_plan.split("-")[0]];
    const { CouponAdder, ExplainResources } = require("../billing");

    return (
      <Row>
        <Col sm={10} smOffset={1}>
          <Well style={{ boxShadow: "5px 5px 5px lightgray", zIndex: 1 }}>
            {this.render_create_subscription_options()}
            {this.props.selected_plan !== ""
              ? this.render_create_subscription_confirm(plan_data)
              : undefined}
            {this.props.selected_plan !== "" ? (
              <ConfirmPaymentMethod
                customer={this.props.customer}
                is_recurring={this.is_recurring()}
                on_close={this.props.on_close}
              />
            ) : (
              undefined
            )}
            {this.render_create_subscription_buttons()}
            <Row style={{ paddingTop: "15px" }}>
              <Col sm={5} smOffset={7}>
                <CouponAdder
                  applied_coupons={this.props.applied_coupons}
                  coupon_error={this.props.coupon_error}
                />
              </Col>
            </Row>
          </Well>
          <ExplainResources type="shared" />
        </Col>
      </Row>
    );
  }
}
