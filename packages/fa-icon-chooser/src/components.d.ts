/* eslint-disable */
/* tslint:disable */
/**
 * This is an autogenerated file created by the Stencil compiler.
 * It contains typing information for all components that exist in this project.
 */
import { HTMLStencilElement, JSXBase } from "@stencil/core/internal";
import { IconChooserResult, QueryHandler } from "./components/fa-icon-chooser/fa-icon-chooser";
export namespace Components {
    interface FaIconChooser {
        /**
          * A URL for loading Font Awesome within the icon chooser from the Font Awesome Free or Pro CDN, instead of a kit.  If a kitToken is provided, kit loading will be preferred over this.
         */
        "cdnUrl"?: string;
        "handleQuery": QueryHandler;
        /**
          * CDN integrity attribute required when not using a kit.
         */
        "integrity"?: string;
        /**
          * A kit token identifying a kit in which to find icons. Takes precedence over the version prop if provided: the version associated with the kit will be used for searching.
         */
        "kitToken"?: string;
        /**
          * Whether pro icons should be enabled.
         */
        "pro": boolean;
        /**
          * Font Awesome version in which to find icons.
         */
        "version"?: string;
    }
}
declare global {
    interface HTMLFaIconChooserElement extends Components.FaIconChooser, HTMLStencilElement {
    }
    var HTMLFaIconChooserElement: {
        prototype: HTMLFaIconChooserElement;
        new (): HTMLFaIconChooserElement;
    };
    interface HTMLElementTagNameMap {
        "fa-icon-chooser": HTMLFaIconChooserElement;
    }
}
declare namespace LocalJSX {
    interface FaIconChooser {
        /**
          * A URL for loading Font Awesome within the icon chooser from the Font Awesome Free or Pro CDN, instead of a kit.  If a kitToken is provided, kit loading will be preferred over this.
         */
        "cdnUrl"?: string;
        "handleQuery"?: QueryHandler;
        /**
          * CDN integrity attribute required when not using a kit.
         */
        "integrity"?: string;
        /**
          * A kit token identifying a kit in which to find icons. Takes precedence over the version prop if provided: the version associated with the kit will be used for searching.
         */
        "kitToken"?: string;
        "onFinish"?: (event: CustomEvent<IconChooserResult>) => void;
        /**
          * Whether pro icons should be enabled.
         */
        "pro"?: boolean;
        /**
          * Font Awesome version in which to find icons.
         */
        "version"?: string;
    }
    interface IntrinsicElements {
        "fa-icon-chooser": FaIconChooser;
    }
}
export { LocalJSX as JSX };
declare module "@stencil/core" {
    export namespace JSX {
        interface IntrinsicElements {
            "fa-icon-chooser": LocalJSX.FaIconChooser & JSXBase.HTMLAttributes<HTMLFaIconChooserElement>;
        }
    }
}
