/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { IconChooserResult, IconPrefix, IconUpload, UrlTextFetcher } from "./utils/utils";
import { IconDefinition } from "@fortawesome/fontawesome-common-types";
import { QueryHandler } from "./components/fa-icon-chooser/fa-icon-chooser";
export namespace Components {
    interface FaIcon {
        "class": string;
        "getUrlText"?: UrlTextFetcher;
        "icon"?: IconDefinition;
        "iconUpload"?: IconUpload;
        "kitToken"?: string;
        "name"?: string;
        "pro": boolean;
        "size"?: string;
        "stylePrefix"?: IconPrefix;
        "svgApi": any;
        "svgFetchBaseUrl"?: string;
    }
    interface FaIconChooser {
        /**
          * Callback function that makes returns the text body of a response that corresponds to an HTTP GET request for the given URL.
         */
        "getUrlText": UrlTextFetcher;
        "handleQuery": QueryHandler;
        /**
          * A kit token identifying a kit in which to find icons. Takes precedent over version prop if both are present.
         */
        "kitToken"?: string;
        /**
          * Version to use for finding and loading icons when kitToken is not provided.
         */
        "version"?: string;
    }
}
declare global {
    interface HTMLFaIconElement extends Components.FaIcon, HTMLStencilElement {
    }
    var HTMLFaIconElement: {
        prototype: HTMLFaIconElement;
        new (): HTMLFaIconElement;
    };
    interface HTMLFaIconChooserElement extends Components.FaIconChooser, HTMLStencilElement {
    }
    var HTMLFaIconChooserElement: {
        prototype: HTMLFaIconChooserElement;
        new (): HTMLFaIconChooserElement;
    };
    interface HTMLElementTagNameMap {
        "fa-icon": HTMLFaIconElement;
        "fa-icon-chooser": HTMLFaIconChooserElement;
    }
}
declare namespace LocalJSX {
    interface FaIcon {
        "class"?: string;
        "getUrlText"?: UrlTextFetcher;
        "icon"?: IconDefinition;
        "iconUpload"?: IconUpload;
        "kitToken"?: string;
        "name"?: string;
        "pro"?: boolean;
        "size"?: string;
        "stylePrefix"?: IconPrefix;
        "svgApi"?: any;
        "svgFetchBaseUrl"?: string;
    }
    interface FaIconChooser {
        /**
          * Callback function that makes returns the text body of a response that corresponds to an HTTP GET request for the given URL.
         */
        "getUrlText"?: UrlTextFetcher;
        "handleQuery"?: QueryHandler;
        /**
          * A kit token identifying a kit in which to find icons. Takes precedent over version prop if both are present.
         */
        "kitToken"?: string;
        "onFinish"?: (event: CustomEvent<IconChooserResult>) => void;
        /**
          * Version to use for finding and loading icons when kitToken is not provided.
         */
        "version"?: string;
    }
    interface IntrinsicElements {
        "fa-icon": FaIcon;
        "fa-icon-chooser": FaIconChooser;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "fa-icon": LocalJSX.FaIcon & JSXBase.HTMLAttributes<HTMLFaIconElement>;
            "fa-icon-chooser": LocalJSX.FaIconChooser & JSXBase.HTMLAttributes<HTMLFaIconChooserElement>;
        }
    }
}
