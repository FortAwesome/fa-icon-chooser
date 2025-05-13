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
    if (this.iconUpload) {
      this.setIconDefinition({
        prefix: this.stylePrefix,
        iconName: this.iconUpload.name,
        icon: [parseInt(`${this.iconUpload.width}`), parseInt(`${this.iconUpload.height}`), [], this.iconUpload.unicode.toString(16), this.iconUpload.pathData],
      });

      return;
    }

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

    const { findIconDefinition } = this.svgApi;

    const iconDefinition = findIconDefinition?.({
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

    const iconUrl = `${this.svgFetchBaseUrl}/${this.familyStylePathSegment}/${this.name}${this.svgFetchBaseUrl.includes('svg-objects') ? '.json' : '.svg'}?token=${this.kitToken}`;

    const library = get(this, 'svgApi.library');

    if (!library || typeof library.add !== 'function') {
      console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: svgApi library is not properly initialized`, this);
      return;
    }

    const processIconDefinition = (response: string) => {
      let iconDefinition;

      try {
        if (iconUrl.endsWith('.json')) {
          // For FA7+, parse the JSON response directly
          const parsed = JSON.parse(response);

          const iconData = Array.isArray(parsed) ? parsed : parsed.icon;

          if (!iconData || !Array.isArray(iconData) || iconData.length < 5) {
            throw new Error('Invalid icon data structure in JSON response');
          }

          iconDefinition = {
            prefix: this.stylePrefix,
            iconName: this.name,
            icon: iconData,
          };
        } else {
          // For FA6, parse the SVG response
          try {
            const svgData = parseSvgText(response);

            if (!Array.isArray(svgData)) {
              throw new Error('SVG parser did not return an array');
            }

            if (svgData.length < 5) {
              throw new Error(`SVG data array has ${svgData.length} elements, expected 5 or more`);
            }

            // Validate individual elements
            const [width, height, ligatures, _unicode, pathData] = svgData;
            if (typeof width !== 'number' || typeof height !== 'number') {
              throw new Error('Invalid width/height in SVG data');
            }

            if (!Array.isArray(ligatures)) {
              throw new Error('Invalid ligatures array in SVG data');
            }

            if (typeof pathData !== 'string' && !Array.isArray(pathData)) {
              throw new Error('Invalid path data in SVG data');
            }

            iconDefinition = {
              iconName: this.name,
              prefix: this.stylePrefix,
              icon: svgData,
            };
          } catch (e) {
            console.error(`${CONSOLE_MESSAGE_PREFIX}: SVG parsing error:`, e);
            throw new Error(`SVG parsing error: ${e.message}`);
          }
        }

        library.add(iconDefinition);
        this.setIconDefinition(iconDefinition);
      } catch (e) {
        console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: failed to process icon definition:`, e);
        throw e;
      }
    };

    const fetchIcon = (fn: UrlTextFetcher) => {
      this.loading = true;
      fn(iconUrl)
        .then(processIconDefinition)
        .catch(e => {
          console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: failed when using 'getUrlText' to fetch icon`, e, this);
        })
        .finally(() => {
          this.loading = false;
        });
    };

    if ('function' !== typeof this.getUrlText) {
      const getUrlTextFn = Object.getOwnPropertyDescriptor(this, 'getUrlText')?.get?.();

      if ('function' !== typeof getUrlTextFn) {
        console.error(`${CONSOLE_MESSAGE_PREFIX}: fa-icon: 'getUrlText' prop is absent but is necessary for fetching icon`, this);
        return;
      }
      fetchIcon(getUrlTextFn);
    } else {
      fetchIcon(this.getUrlText);
    }
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
