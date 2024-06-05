import { Component, Host, Prop, State, h } from '@stencil/core';
import { IconUpload, parseSvgText, UrlTextFetcher, CONSOLE_MESSAGE_PREFIX } from '../../utils/utils';
import { IconDefinition } from '@fortawesome/fontawesome-common-types';
import { get } from 'lodash';

/**
 * This fa-icon component isn't THE fa-icon component. It's just a convenience
 * component to help with displaying icons within the Icon Chooser.
 */
@Component({
  tag: 'fa-icon',
  styleUrl: 'fa-icon.css',
  shadow: false,
})
export class FaIcon {
  @Prop() name?: string;

  @Prop() stylePrefix?: string;

  @Prop() familyStylePathSegment: string;

  @Prop() svgApi: any;

  @Prop() pro: boolean = false;

  @Prop() iconUpload?: IconUpload;

  @Prop() class: string;

  @Prop() svgFetchBaseUrl?: string;

  @Prop() getUrlText?: UrlTextFetcher;

  @Prop() kitToken?: string;

  @Prop() icon?: IconDefinition;

  @Prop() size?: string;

  @State() loading: boolean = false;

  @State() iconDefinition: any;

  componentWillLoad() {
    if (this.iconUpload) {
      this.iconDefinition = {
        prefix: this.stylePrefix,
        iconName: this.iconUpload.name,
        icon: [parseInt(`${this.iconUpload.width}`), parseInt(`${this.iconUpload.height}`), [], this.iconUpload.unicode.toString(16), this.iconUpload.pathData],
      };

      return;
    }

    if (this.icon) {
      this.iconDefinition = this.icon;

      return;
    }

    if (!this.svgApi) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: svgApi prop is needed but is missing`, this);
      return;
    }

    if (!(this.stylePrefix && this.name)) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: the 'stylePrefix' and 'name' props are needed to render this icon but not provided.`, this);
      return;
    }

    if (!this.familyStylePathSegment) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: the 'familyStylePathSegment' prop is required to render this icon but not provided.`, this);
      return;
    }

    const { findIconDefinition } = this.svgApi;

    const iconDefinition =
      findIconDefinition &&
      findIconDefinition({
        prefix: this.stylePrefix,
        iconName: this.name,
      });

    if (iconDefinition) {
      this.iconDefinition = iconDefinition;
      return;
    }

    if (!this.pro) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: 'pro' prop is false but no free icon is available`, this);
      return;
    }

    if (!this.svgFetchBaseUrl) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: 'svgFetchBaseUrl' prop is absent but is necessary for fetching icon`, this);
      return;
    }

    if (!this.kitToken) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: 'kitToken' prop is absent but is necessary for accessing icon`, this);
      return;
    }

    this.loading = true;

    const iconUrl = `${this.svgFetchBaseUrl}/${this.familyStylePathSegment}/${this.name}.svg?token=${this.kitToken}`;

    const library = get(this, 'svgApi.library');

    if ('function' !== typeof this.getUrlText) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: 'getUrlText' prop is absent but is necessary for fetching icon`, this);
      return;
    }

    this.getUrlText(iconUrl)
      .then(svg => {
        const iconDefinition = {
          iconName: this.name,
          prefix: this.stylePrefix,
          icon: parseSvgText(svg),
        };
        library && library.add(iconDefinition);
        this.iconDefinition = { ...iconDefinition };
      })
      .catch(e => {
        console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: failed when using 'getUrlText' to fetch icon`, e, this);
      })
      .finally(() => {
        this.loading = false;
      });
  }

  buildSvg(iconDefinition: IconDefinition, extraClasses?: string) {
    if (!iconDefinition) return;

    const [width, height, , , svgPathData] = get(iconDefinition, 'icon', []);

    const classes = ['svg-inline--fa'];

    if (this.class) {
      classes.push(this.class);
    }

    if (extraClasses) {
      classes.push(extraClasses);
    }

    if (this.size) {
      classes.push(`fa-${this.size}`);
    }

    const allClasses = classes.join(' ');

    if (Array.isArray(svgPathData)) {
      return (
        <svg class={allClasses} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
          <path fill="currentColor" class="fa-primary" d={svgPathData[1]} />
          <path fill="currentColor" class="fa-secondary" d={svgPathData[0]} />
        </svg>
      );
    } else {
      return (
        <svg class={allClasses} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
          <path fill="currentColor" d={svgPathData} />
        </svg>
      );
    }
  }

  render() {
    return this.iconDefinition ? this.buildSvg(this.iconDefinition) : <Host></Host>;
  }
}
