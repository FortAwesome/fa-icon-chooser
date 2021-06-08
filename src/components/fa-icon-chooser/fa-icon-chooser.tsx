import { Component, Prop, State, h } from '@stencil/core';
import { get, size, debounce } from 'lodash';
import { IconLookup } from '@fortawesome/fontawesome-common-types';

export interface IconChooserResult extends IconLookup {
  class?: string;
  style?: string;
}

export interface IconChooserEventHandler {
  handleQuery: (document: string) => Promise<any>;
  handleResult: (result: IconChooserResult) => void;
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
  @Prop() enablePro: boolean;

  @Prop() eventHandler: IconChooserEventHandler;

  @State() query: string;

  @State() isQuerying: boolean;

  @State() hasQueried: boolean;

  @State() queryResults: any[];

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
    const usingPro = true
    this.eventHandler.handleQuery(
      `
      query {
        search(version:"${version}", query: "${query}", first: 10) {
          id
          label
          membership {
            free
            ${ usingPro ? 'pro' : '' }
          }
        }
      }`
    )
    .then(response => {
      this.queryResults = get(response, 'data.search', [])
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
      <div>
        <ul class='icons'>
          {
            size(this.query) === 0
            ? <p>type to search</p>
            : (
              this.isQuerying
              ? <p>searching...</p>
              : (size(this.queryResults) > 0
                  ?  this.queryResults.map(result =>
                      <li key={ `fas-${ result.id }`}>
                        <button onClick={() => this.eventHandler.handleResult({ prefix: 'fas', iconName: result.id})}>
                          <i class={ `fas fa-${result.id}` }></i>
                        </button>
                      </li>
                    )
                  : <p>(no results)</p>
                )
            )
          }
        </ul>
      </div>
    </div>;
  }
}
