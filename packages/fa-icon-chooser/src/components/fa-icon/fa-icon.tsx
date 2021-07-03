import { Component, Host, Prop, State, h } from '@stencil/core'
import { IconPrefix, IconUpload, FaTechnology, PREFIX_TO_STYLE, parseSvgText } from '../../utils/utils'
import { get } from 'lodash'

@Component({
  tag: 'fa-icon',
  styleUrl: 'fa-icon.css',
  shadow: false,
})
export class FaIcon {
  @Prop() name: string

  @Prop() stylePrefix: IconPrefix = 'fas'

  @Prop() svgApi: any

  @Prop() pro: boolean = false

  @Prop() iconUpload?: IconUpload

  @Prop() technology: FaTechnology

  @Prop() class: string

  @Prop() svgFetchBaseUrl?: string

  @Prop() kitToken?: string

  @State() loading: boolean = false;

  @State() iconDefinition: any;

  componentWillLoad() {
    if(this.technology === FaTechnology.KitSvg || this.technology === FaTechnology.CdnSvg) {
      // TODO: what do we do if technology is Svg, but not factory is provided?
      if(!this.svgApi) return

      const { findIconDefinition } = this.svgApi

      const iconDefinition = findIconDefinition && findIconDefinition({
        prefix: this.stylePrefix,
        iconName: this.name
      })

      if(iconDefinition) {
        this.iconDefinition = iconDefinition
        return
      }

      // TODO: what should we do in this situation?
      if(!iconDefinition && this.technology === FaTechnology.CdnSvg) return

      // TODO: what should we do in this situation?
      if(!this.svgFetchBaseUrl) return

      if( this.technology === FaTechnology.KitSvg && this.pro ) {
        this.loading = true

        const iconUrl = `${this.svgFetchBaseUrl}/${ PREFIX_TO_STYLE[this.stylePrefix]}/${this.name}.svg`;

        const fullUrl = this.kitToken ? `${iconUrl}?token=${this.kitToken}` : iconUrl

        const library = get(this, 'svgApi.library')

        // TODO: do we need to support more than fetch?
        // TODO: what do we want to do about these error conditions?
        fetch(fullUrl).then((response) => {
          if (response.ok) {
            response.text().then((svg) => {
              const iconDefinition = {
                iconName: this.name,
                prefix: this.stylePrefix,
                icon: parseSvgText(svg)
              }
              library && library.add(iconDefinition)
              this.iconDefinition = {...iconDefinition}
            })
            .catch(e => {
              console.error(`DEBUG: bad response text for icon: ${this.name} with style: ${this.stylePrefix}`, e)
            })
          } else {
            console.log(`DEBUG: response not ok for icon: ${this.name}`, response)
          }
        })
        .catch(e => {
          console.error(`DEBUG: caught error for icon: ${this.name}`, e)
        })
        .finally(() => {
          this.loading = false
        })
      }
    }
  }

  buildSvg(iconDefinition) {
    if(!iconDefinition) return

    const [ width, height,,, svgPathData ] = get(iconDefinition, 'icon', [])

    if(Array.isArray(svgPathData)) {
      return (<svg class={`svg-inline--fa ${this.class}`} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
        <path class="fa-primary" d={ svgPathData[0] }/>
        <path class="fa-secondary" d={ svgPathData[1] }/>
      </svg>)
    } else {
      return (<svg class={`svg-inline--fa ${this.class}`} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
        <path d={ svgPathData }/>
      </svg>)
    }
  }

  render() {
    if(this.loading) {
      return (
        <Host>
          <svg class="svg-inline--fa fa-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M288 39.056v16.659c0 10.804 7.281 20.159 17.686 23.066C383.204 100.434 440 171.518 440 256c0 101.689-82.295 184-184 184-101.689 0-184-82.295-184-184 0-84.47 56.786-155.564 134.312-177.219C216.719 75.874 224 66.517 224 55.712V39.064c0-15.709-14.834-27.153-30.046-23.234C86.603 43.482 7.394 141.206 8.003 257.332c.72 137.052 111.477 246.956 248.531 246.667C393.255 503.711 504 392.788 504 256c0-115.633-79.14-212.779-186.211-240.236C302.678 11.889 288 23.456 288 39.056z"/></svg>
        </Host>
      )
    }

    if(this.technology === FaTechnology.CdnWebfont || this.technology === FaTechnology.KitWebfont) {
      return (
        <Host>
          <i class={ `${this.class} ${ this.stylePrefix  } fa-${this.name}` }></i>
        </Host>
      )
    }

    if((this.technology === FaTechnology.CdnSvg || !this.pro) && this.iconDefinition) {
      return (
        <Host>
          { this.buildSvg( this.iconDefinition ) }
        </Host>
      )
    }

    if((FaTechnology.KitSvg === this.technology) && this.pro && this.iconDefinition) {
      return (
        <Host>
          { this.buildSvg( this.iconDefinition ) }
        </Host>
      )
    }

    return (<Host></Host>)
  }
}
