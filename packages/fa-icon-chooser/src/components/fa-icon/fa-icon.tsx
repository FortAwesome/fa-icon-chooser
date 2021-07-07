import { Component, Host, Prop, State, h } from '@stencil/core'
import { IconPrefix, IconUpload, PREFIX_TO_STYLE, parseSvgText } from '../../utils/utils'
import { IconDefinition } from '@fortawesome/fontawesome-common-types'
import { get } from 'lodash'
import { faCircleNotch } from '../../utils/icons'

@Component({
  tag: 'fa-icon',
  styleUrl: 'fa-icon.css',
  shadow: false,
})
export class FaIcon {
  @Prop() name?: string

  @Prop() stylePrefix?: IconPrefix

  @Prop() svgApi: any

  @Prop() pro: boolean = false

  @Prop() iconUpload?: IconUpload

  @Prop() class: string

  @Prop() svgFetchBaseUrl?: string

  @Prop() kitToken?: string

  @Prop() icon?: IconDefinition

  @Prop() size?: string

  @State() loading: boolean = false;

  @State() iconDefinition: any;

  constructor() {
    if(!(this.icon || (this.stylePrefix && this.name))) {
      // TODO: how do we want to handle this error?
      throw new Error('fa-icon component requires either `icon` prop or `style-prefix` and `name` props')
    }
  }

  componentWillLoad() {
    if(!this.svgApi) return

    if(this.iconUpload) {
      this.iconDefinition = {
        prefix: 'fak',
        iconName: this.iconUpload.name,
        icon: [
          this.iconUpload.width,
          this.iconUpload.height,
          [],
          this.iconUpload.unicode,
          this.iconUpload.path
        ]
      }

      return
    }

    if(this.icon) {
      this.iconDefinition = this.icon
      return
    }

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
    if(!this.pro) return

    // TODO: what should we do in this situation?
    if(!this.svgFetchBaseUrl) return

    // TODO: what should we do in this situation?
    if(!this.kitToken) return

    this.loading = true

    const iconUrl = `${this.svgFetchBaseUrl}/${ PREFIX_TO_STYLE[this.stylePrefix]}/${this.name}.svg?token=${this.kitToken}`;

    const library = get(this, 'svgApi.library')

    // TODO: do we need to support more than fetch?
    // TODO: what do we want to do about these error conditions?
    fetch(iconUrl).then((response) => {
      if (response.ok) {
        return response.text().then((svg) => {
          const iconDefinition = {
            iconName: this.name,
            prefix: this.stylePrefix,
            icon: parseSvgText(svg)
          }
          library && library.add(iconDefinition)
          this.iconDefinition = {...iconDefinition}
        })
      } else {
        throw response
      }
    })
    .catch(e => {
      console.error('Font Awesome Icon Chooser: failed when fetching an individual SVG icon', e)
    })
    .finally(() => {
      this.loading = false
    })
  }

  buildSvg(iconDefinition: IconDefinition, extraClasses?: string) {
    if(!iconDefinition) return

    const [ width, height,,, svgPathData ] = get(iconDefinition, 'icon', [])

    const classes = ['svg-inline--fa']

    if(this.class) {
      classes.push(this.class)
    }

    if(extraClasses) {
      classes.push(extraClasses)
    }

    if(this.size) {
      classes.push(`fa-${this.size}`)
    }

    const allClasses = classes.join(' ')

    if(Array.isArray(svgPathData)) {
      return (<svg class={ allClasses } xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
        <path fill="currentColor" class="fa-primary" d={ svgPathData[0] }/>
        <path fill="currentColor" class="fa-secondary" d={ svgPathData[1] }/>
      </svg>)
    } else {
      return (<svg class={ allClasses } xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`}>
        <path fill="currentColor" d={ svgPathData }/>
      </svg>)
    }
  }

  render() {
    if(this.loading) {
      return this.buildSvg( faCircleNotch, 'fa-spin' )
    }

    return this.iconDefinition
    ? this.buildSvg( this.iconDefinition )
    : (<Host></Host>)
  }
}
