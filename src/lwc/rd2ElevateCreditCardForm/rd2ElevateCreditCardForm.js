import { api, track, LightningElement } from 'lwc';

import tokenHandler from 'c/psElevateTokenHandler';
import getOrgDomainInfo from '@salesforce/apex/PS_ElevateController.getOrgDomainInfo';

import commonPaymentServices from '@salesforce/label/c.commonPaymentServices';
import assistiveSpinner from '@salesforce/label/c.geAssistiveSpinner';

import rd2ElevateDisableLabel from '@salesforce/label/c.RD2_ElevateDisableLabel';
import rd2ElevateDisabledMessage from '@salesforce/label/c.RD2_ElevateDisabledMessage';
import rd2ElevateEnableLabel from '@salesforce/label/c.RD2_ElevateEnableLabel';

const WIDGET_DISABLED_EVENT_NAME = 'rd2TokenizeCardWidgetDisabled';


/***
* @description Payment services Elevate credit card widget on the Recurring Donation entry form
*/
export default class rd2ElevateCreditCardForm extends LightningElement {

    labels = {
        commonPaymentServices,
        assistiveSpinner,
        rd2ElevateDisableLabel,
        rd2ElevateDisabledMessage,
        rd2ElevateEnableLabel
    };

    @track visualforceOrigin;
    @track visualforceOriginUrls;

    @track isLoading = true;
    @track isDisabled = false;
    @track alert = {};

    /***
    * @description Get the organization domain information such as domain and the pod name
    * in order to determine the Visualforce origin URL so that origin source can be verified.
    */
    async connectedCallback() {
        const domainInfo = await getOrgDomainInfo();

        this.visualforceOriginUrls = tokenHandler.getVisualforceOriginURLs(domainInfo);
    }

    /***
    * @description Listens for a message from the Visualforce iframe.
    */
    renderedCallback() {
        let component = this;
        tokenHandler.registerPostMessageListener(component);
    }

    /***
    * @description Elevate credit card tokenization Visualforce page URL
    */
    get tokenizeCardPageUrl() {
        return tokenHandler.getTokenizeCardPageURL();
    }

    /***
    * @description Method handles messages received from Visualforce iframe wrapper.
    * @param message Message received from iframe
    */
    async handleMessage(message) {
        tokenHandler.handleMessage(message);

        if (message.isLoaded) {
            this.isLoading = false;
        }
    }

    /***
    * @description Method sends a message to the visualforce page iframe requesting a token. 
    */
    requestToken() {
        const iframe = this.template.querySelector(`[data-id='${this.labels.commonPaymentServices}']`);

        return tokenHandler.requestToken(this.visualforceOrigin, iframe, this.handleError);
    }

    /***
    * @description Handles user onclick event for disabling the widget.
    */
    handleUserDisabledWidget() {
        this.hideWidget();
        tokenHandler.dispatchApplicationEvent(WIDGET_DISABLED_EVENT_NAME, {
            isWidgetDisabled: true
        });
    }

    /***
    * @description Handles user onclick event for re-enabling the widget.
    */
    handleUserEnabledWidget() {
        this.isLoading = true;
        this.displayWidget();
        tokenHandler.dispatchApplicationEvent(WIDGET_DISABLED_EVENT_NAME, {
            isWidgetDisabled: false
        });
    }

    /***
    * @description Enables or disables the widget based on provided args.
    */
    displayWidget() {
        this.isDisabled = false;
        this.clearError();
    }

    /***
    * @description Enables or disables the widget based on provided args.
    */
    hideWidget() {
        this.isDisabled = true;
        this.clearError();
    }

    /**
     * Clears the error display
     */
    clearError() {
        this.alert = {};
    }

    /**
     * Handles the error from the iframe
     * @param message Error container
     * @return object Error object returned to the RD entry form
     */
    handleError = (message) => {
        let errorValue;
        let isObject = false;

        if (typeof message.error === 'object') {
            errorValue = JSON.stringify(Object.values(message.error));
            isObject = true;

        } else if (typeof message.error === 'string') {
            errorValue = message.error;
        }

        this.alert = {
            theme: 'error',
            show: true,
            message: errorValue,
            variant: 'inverse',
            icon: 'utility:error'
        };

        return {
            error: {
                message: errorValue,
                isObject: isObject
            }
        };
    }

    /**
     * Requests a payment token when the form is saved
     * @return {paymentToken: Promise<*>} Promise that will resolve to the token
     */
    @api
    returnValues() {
        return {
            payload: this.requestToken()
        };
    }

}