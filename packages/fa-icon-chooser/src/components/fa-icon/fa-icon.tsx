import { Component, h, Host, Prop, State } from '@stencil/core';
import { CONSOLE_MESSAGE_PREFIX, IconUpload, parseSvgText, UrlTextFetcher } from '../../utils/utils';
import { IconDefinition } from '../../utils/utils';
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
  @Prop()
  name?: string;

  @Prop()
  stylePrefix?: string;

  @Prop()
  familyStylePathSegment: string;

  @Prop()
  svgApi: any;

  @Prop()
  pro: boolean = false;

  @Prop()
  iconUpload?: IconUpload;

  @Prop()
  class: string;

  @Prop()
  svgFetchBaseUrl?: string;

  @Prop()
  getUrlText?: UrlTextFetcher;

  @Prop()
  kitToken?: string;

  @Prop()
  icon?: IconDefinition;

  @Prop()
  size?: string;

  @Prop()
  emitIconDefinition?: (iconDefinition: IconDefinition) => void;

  @State()
  loading: boolean = false;

  @State()
  iconDefinition: any;

  setIconDefinition(iconDefinition: IconDefinition): void {
    this.iconDefinition = iconDefinition;
    if ('function' === typeof this.emitIconDefinition) {
      this.emitIconDefinition(iconDefinition);
    }
  }

  componentWillLoad() {
    // Handle icon upload case
    if (this.iconUpload) {
      this.setIconDefinition({
        prefix: this.stylePrefix,
        iconName: this.iconUpload.name,
        icon: [parseInt(`${this.iconUpload.width}`), parseInt(`${this.iconUpload.height}`), [], this.iconUpload.unicode.toString(16), this.iconUpload.pathData],
      });
      return;
    }

    // Handle pre-defined icon case
    if (this.icon) {
      this.setIconDefinition(this.icon);
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

    const { findIconDefinition } = this.svgApi || {};

    const iconDefinition = findIconDefinition({
      prefix: this.stylePrefix,
      iconName: this.name,
    });

    if (iconDefinition) {
      this.setIconDefinition(iconDefinition);
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

    // Construct the icon URL and set up processing function
    const iconUrl = `${this.svgFetchBaseUrl}/${this.familyStylePathSegment}/${this.name}${this.svgFetchBaseUrl.includes('svg-objects') ? '.json' : '.svg'}?token=${this.kitToken}`;

    const processIconDefinition = (response: string) => {
      if (!response) {
        throw new Error('Empty response received from fetch');
      }
      let iconDefinition;

      try {
        const parsed = this.svgFetchBaseUrl.includes('svg-objects') ? JSON.parse(response) : parseSvgText(response);

        if (!parsed) {
          throw new Error('Failed to parse response');
        }

        const iconData = Array.isArray(parsed) ? parsed : parsed.icon;

        if (!iconData || !Array.isArray(iconData) || iconData.length < 5) {
          throw new Error(`Invalid icon data: ${JSON.stringify(iconData)}`);
        }

        iconDefinition = {
          prefix: this.stylePrefix,
          iconName: this.name,
          icon: iconData,
        };

        this.svgApi.library.add(iconDefinition);
        this.setIconDefinition(iconDefinition);
      } catch (e) {
        console.error(`${CONSOLE_MESSAGE_PREFIX}: Error processing icon:`, e);
        throw e;
      }
    };

    if (!this.getUrlText) {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: getUrlText callback is missing`);
      return;
    }

    this.loading = true;
    this.getUrlText(iconUrl)
      .then(processIconDefinition)
      .catch(e => {
        console.error(`${CONSOLE_MESSAGE_PREFIX}: Failed to fetch icon ${iconUrl}:`, e);
        throw e;
      })
      .finally(() => {
        this.loading = false;
      });
  }

  buildSvg(iconDefinition: IconDefinition, extraClasses?: string) {
    if (!iconDefinition) {
      console.log(`${CONSOLE_MESSAGE_PREFIX}: No icon definition provided to buildSvg`);
      return;
    }

    const iconData = get(iconDefinition, 'icon', []);

    const [width, height, , , svgPathData] = iconData;

    if (!width || !height || !svgPathData) {
      console.log(`${CONSOLE_MESSAGE_PREFIX}: Missing required SVG properties`, { width, height, svgPathData });
      return;
    }

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
