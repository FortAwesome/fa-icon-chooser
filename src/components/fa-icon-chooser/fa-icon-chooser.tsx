import { Component, Event, EventEmitter, Prop, State, h } from '@stencil/core';
import { get, size, debounce } from 'lodash';
import { IconLookup } from '@fortawesome/fontawesome-common-types';

const STYLE_RESULT_TO_PREFIX = {
  solid: 'fas',
  duotone: 'fad',
  regular: 'far',
  light: 'fal',
  thin: 'fat'
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

  @State() query: string;

  @State() isQuerying: boolean;

  @State() hasQueried: boolean;

  @State() icons: IconLookup[];

  kitMetadata: KitMetadata;

  resolvedVersion: string;

  isProEnabled: boolean;

  constructor() {
    const originalUpdateQueryResults = this.updateQueryResults.bind(this)
    this.updateQueryResults = debounce( query => {
      originalUpdateQueryResults(query)
    }, 500 )
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
      this.icons = get(response, 'data.search', []).reduce((acc: Array<IconLookup>, result: any) => {
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
      }, [])

      this.hasQueried = true
      this.isQuerying = false
    })
    .catch(e => {
      console.error('WHOOPS!', e)
    })
  }

  onKeyUp(e: any) {
    this.query = e.target.value
    this.updateQueryResults(this.query)
  }

  render() {
    return <div class="fa-icon-chooser">
      <form>
        <label htmlFor="search" class="sr-only">Search the v6 Beta Icons</label>
        <div class="wrap-search with-icon-before">
          <i class="fas fa-search icons-search-decorative"></i>
          <input name="search" id="search" class="rounded" value={this.query} onKeyUp={this.onKeyUp.bind(this)} placeholder="Search for icons by name, category, or keyword" type="text"></input>
        </div>
      </form>
      <div class="icon-listing">
        {
          size(this.query) === 0
          ? <p>type to search</p>
          : (
            this.isQuerying
            ? <p>searching...</p>
            : (size(this.icons) > 0
                ?  this.icons.map(icon =>
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
