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
  @Prop() enablePro: boolean;

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

  constructor() {
    const originalUpdateQueryResults = this.updateQueryResults.bind(this)
    this.updateQueryResults = debounce( query => {
      originalUpdateQueryResults(query)
    }, 500 )
  }

  updateQueryResults(query: string) {
    this.hasQueried = false
    this.isQuerying = true
    const version = '5.15.3'
    this.handleQuery(
      `
      query {
        search(version:"${version}", query: "${query}", first: 10) {
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

        if(this.enablePro && !!membership.pro) {
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
      <div>
        <input value={ this.query } onKeyUp={ this.onKeyUp.bind(this) } placeholder="search..."></input>
      </div>
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
