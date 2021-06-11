import { Component, Event, EventEmitter, Prop, State, h } from '@stencil/core';
import { get, size, debounce } from 'lodash';
import { IconLookup } from '@fortawesome/fontawesome-common-types';

// TODO: figure out whether the IconPrefix type in @fortawesome/fontawesome-common-types
// should have 'fat' in it.
// But this also needs to include "fak" for icon uploads. Does that even belong in the IconPrefix type?
export type IconPrefix = "fas" | "fab" | "far" | "fal" | "fat" | "fad" | "fak";

const STYLE_RESULT_TO_PREFIX = {
  solid: 'fas',
  duotone: 'fad',
  regular: 'far',
  light: 'fal',
  thin: 'fat',
  kit: 'fak',
  brands: 'fab'
}

export interface IconChooserResult extends IconLookup {
  class?: string;
  style?: string;
}

export type QueryHandler = (document: string) => Promise<any>;

export type IconUpload = {
  name: string;
  unicode: number;
  version: number;
  width: string;
  height: string;
  path: string;
};

export type StyleFilters = {
  [prefix in IconPrefix]: boolean;
}

type KitMetadata = {
  version: string;
  technologySelected: string;
  licenseSelected: string;
  name: string;
  iconUploads: Array<IconUpload> | null;
};

@Component({
  tag: 'fa-icon-chooser',
  styleUrl: 'fa-icon-chooser.css',
  shadow: false,
})
export class FaIconChooser {
  /**
   * Font Awesome version in which to find icons.
   */
  @Prop() version?: string;

  /**
   * A kit token identifying a kit in which to find icons. Takes precedence over
   * the version prop if provided: the version associated with the kit will be used
   * for searching.
   */
  @Prop() kitToken?: string;

  /**
   * Whether pro icons should be enabled.
   */
  @Prop() pro: boolean;

  @Prop() handleQuery: QueryHandler;

  @Event({
    eventName: 'finish',
    composed: true,
    cancelable: true,
    bubbles: true,
  }) finish: EventEmitter<IconChooserResult>;

  @State() query: string = '';

  @State() isQuerying: boolean = false;

  @State() hasQueried: boolean = false;

  @State() icons: IconLookup[] = [];

  @State() styleFilterEnabled: boolean = false;

  @State() styleFilters: StyleFilters = {
    fas: false,
    far: false,
    fad: false,
    fat: false,
    fab: false,
    fal: false,
    fak: false
  };

  @State() kitMetadata: KitMetadata;

  resolvedVersion: string;

  isProEnabled: boolean;

  constructor() {
    const originalUpdateQueryResults = this.updateQueryResults.bind(this)
    this.updateQueryResults = debounce( query => {
      originalUpdateQueryResults(query)
    }, 500 )

    this.toggleStyleFilter = this.toggleStyleFilter.bind(this)
  }

  componentWillLoad() {
    if(!this.kitToken) {
      this.isProEnabled = this.pro

      if(!this.version) {
        throw new Error('invalid props: since no kitToken was specified, there must be a version')
      }
    }

    this.handleQuery(
      `
      query {
        me {
          kit(token:"${ this.kitToken }") {
            version
            technologySelected
            licenseSelected
            name
            iconUploads {
              name
              unicode
              version
              width
              height
              path
            }
          }
        }
      }
      `
    )
    .then(response => {
      // TODO: consider real error handling.
      if(get(response, 'errors')) {
        console.error('GraphQL query errors', response.errors)
        throw new Error('GraphQL query errors')
      }

      const kit = get(response, 'data.me.kit')
      this.kitMetadata = kit

      // TODO: replace this placeholder logic with, probably, real API calls
      // that handle resolving the version.
      switch(get(this.kitMetadata, 'version')) {
        case '5.x':
        case 'latest':
          this.resolvedVersion = '5.15.3'
          break
        case '6.x':
          this.resolvedVersion = '6.0.0-beta1'
          break
        default:
          this.resolvedVersion = kit.version
      }

      this.isProEnabled = this.kitMetadata.licenseSelected === 'pro'

      // TODO: figure out some real error handling here.
      if(! this.resolvedVersion ) {
        throw new Error('invalid state: there must be a resolved version')
      }
    })
    .catch(e => {
      console.error('WHOOPS!', e)
    })
  }

  updateQueryResults(query: string) {
    this.hasQueried = false
    this.isQuerying = true

    this.handleQuery(
      `
      query {
        search(version:"${ this.resolvedVersion }", query: "${ query }", first: 10) {
          id
          label
          membership {
            free
            pro
          }
        }
      }`
    )
    .then(response => {
      // TODO: test the case where data.search is null (which would happen if the API
      // server returns a not_found)

      const iconUploads = get(this, 'kitMetadata.iconUploads', []).map(i => {
        return { prefix: 'fak', iconName: i.name }
      })

      this.icons = (get(response, 'data.search') || [])
        .reduce((acc: Array<IconLookup>, result: any) => {
          const { id, membership } = result

          const styles = membership.free

          if(this.isProEnabled && !!membership.pro) {
            membership.pro
              .filter(style => !membership.free.includes(style))
              .forEach(style => styles.push(style))
          }

          styles.map(style => {
            const prefix = STYLE_RESULT_TO_PREFIX[style]

            acc.push({
              iconName: id,
              prefix
            })
          })

          return acc
      }, iconUploads)

      this.hasQueried = true
      this.isQuerying = false
    })
    .catch(e => {
      console.error('WHOOPS!', e)
    })
  }

  filteredIcons(): IconLookup[] {
    if(!this.styleFilterEnabled) return this.icons

    return this.icons.filter(({ prefix }) => this.styleFilters[prefix])
  }

  resetStyleFilter(): void {
    Object.keys(this.styleFilters).forEach(style => {
      this.styleFilters[style] = false
    })

    this.styleFilterEnabled = false
  }

  isOnlyEnabledStyleFilter(style: string): boolean {
    if(this.styleFilters[style]) {
      const foundAnotherEnabledStyleFilter = !!Object.keys(this.styleFilters).find(styleFilter => {
        if(styleFilter === style) return false // the current style doesn't count

        return this.styleFilters[styleFilter]
      })

      return !foundAnotherEnabledStyleFilter
    }

    return false
  }

  showCheckedStyleIcon(style: string) {
    return this.styleFilterEnabled && this.styleFilters[style]
  }

  toggleStyleFilter(style: string): void {
    if(this.styleFilterEnabled) {
      // If we're turning "off" the last style filter, this has the effect
      // if disabling the master style filter as well.
      if(this.isOnlyEnabledStyleFilter(style)) {
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] }
        this.styleFilterEnabled = false
      } else {
        // simply toggle this style
        this.styleFilters = { ...this.styleFilters, [style]: !this.styleFilters[style] }
      }
    } else {
      this.styleFilters = { ...this.styleFilters, [style]: true }
      this.styleFilterEnabled = true
    }
  }

  isV6() {
    return this.resolvedVersion && this.resolvedVersion[0] === '6'
  }

  hasIconUploads() {
    return !!(this.kitToken && this.kitMetadata && size(this.kitMetadata.iconUploads) > 0)
  }

  isLoadingKit() {
    return !this.kitToken || !this.kitMetadata
  }

  onKeyUp(e: any): void {
    this.query = e.target.value
    this.updateQueryResults(this.query)
  }

  render() {
    if(this.isLoadingKit()) {
      return <div class="fa-icon-chooser">loading kit...</div>
    }

    return <div class="fa-icon-chooser">
      <form>
        <label htmlFor="search" class="sr-only">Search the v6 Beta Icons</label>
        <div class="wrap-search with-icon-before">
          <i class="fas fa-search icons-search-decorative"></i>
          <input type="text" name="search" id="search" class="rounded" value={this.query} onKeyUp={this.onKeyUp.bind(this)} placeholder="Search for icons by name, category, or keyword"></input>
        </div>
        <div class="icons-style-menu-listing display-flex flex-items-center">
          <div class="wrap-icons-style-choice margin-3xs column">
            <input id="icons-style-solid" onChange={() => this.toggleStyleFilter('fas') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-solid" class="icons-style-choice margin-0 display-flex flex-column flex-items-center">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('fas')
                  ? <span key="a"><i class="checked-icon fas fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon fas fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>solid<span class="sr-only"> style icons</span>
            </label>
          </div>
          <div class="wrap-icons-style-choice margin-3xs column">
            <input id="icons-style-regular" onChange={() => this.toggleStyleFilter('far') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-regular" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('far')
                  ? <span key="a"><i class="checked-icon far fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon far fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>regular<span class="sr-only"> style icons</span>
            </label>
          </div>
          <div class="wrap-icons-style-choice margin-3xs column">
            <input id="icons-style-light" onChange={() => this.toggleStyleFilter('fal') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-light" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('fal')
                  ? <span key="a"><i class="checked-icon fal fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon fal fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>light<span class="sr-only"> style icons</span>
            </label>
          </div>
          { this.isV6() &&
            <div class="wrap-icons-style-choice margin-3xs column">
              <input id="icons-style-thin" onChange={() => this.toggleStyleFilter('fat') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-thin" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  {
                    this.showCheckedStyleIcon('fat')
                    ? <span key="a"><i class="checked-icon fat fa-grin-tongue fa-fw fa-2x"></i></span>
                    : <span key="b"><i class="unchecked-icon fat fa-smile fa-fw fa-2x"></i></span>
                  }
                </span>
                <span class="sr-only">Show </span>thin<span class="sr-only"> style icons</span>
              </label>
            </div>
          }
          <div class="wrap-icons-style-choice margin-3xs column">
            <input id="icons-style-duotone" onChange={() => this.toggleStyleFilter('fad') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-duotone" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                {
                  this.showCheckedStyleIcon('fad')
                  ? <span key="a"><i class="checked-icon fad fa-grin-tongue fa-fw fa-2x"></i></span>
                  : <span key="b"><i class="unchecked-icon fad fa-smile fa-fw fa-2x"></i></span>
                }
              </span>
              <span class="sr-only">Show </span>duotone<span class="sr-only"> style icons</span>
            </label>
          </div>
          <div class="wrap-icons-style-choice margin-3xs column">
            <input id="icons-style-brands" onChange={() => this.toggleStyleFilter('fab') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
            <label htmlFor="icons-style-brands" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
              <span class="position-relative margin-bottom-sm">
                <i class="fab fa-font-awesome fa-fw fa-2x"></i>
              </span>
              <span class="sr-only">Show </span>brands<span class="sr-only"> style icons</span>
            </label>
          </div>
          {
            this.hasIconUploads() &&
            <div class="wrap-icons-style-choice margin-3xs column">
              <input id="icons-style-uploads" onChange={() => this.toggleStyleFilter('fak') } type="checkbox" name="icons-style" class="input-checkbox-custom"></input>
              <label htmlFor="icons-style-uploads" class="icons-style-choice margin-0 display-flex flex-column flex-items-center ">
                <span class="position-relative margin-bottom-sm">
                  <i class="fas fa-icons fa-fw fa-2x"></i>
                </span>
                <span class="sr-only">Show </span>Uploaded<span class="sr-only"> icons</span>
              </label>
            </div>
          }
        </div>
      </form>
      <div class="icon-listing">
        {
          size(this.query) === 0
          ? <p>type to search</p>
          : (
            this.isQuerying
            ? <p>searching...</p>
            : (size(this.filteredIcons()) > 0
                ?  this.filteredIcons().map(icon =>
                    <article class="wrap-icon" key={ `${icon.prefix}-${ icon.iconName }`}>
                    <button class="icon subtle display-flex flex-column flex-items-center flex-content-center" onClick={() => this.finish.emit(icon)}>
                        <i class={ `${ icon.prefix } fa-2x fa-${ icon.iconName }` }></i>
                      <span class="icon-name size-xs text-truncate margin-top-lg">{`${ icon.iconName }`}</span>
                      </button>
                    </article>
                  )
                : <p>(no results)</p>
              )
          )
        }
      </div>
    </div>;
  }
}
