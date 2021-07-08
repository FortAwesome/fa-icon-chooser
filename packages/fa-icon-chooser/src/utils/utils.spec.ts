import {
  resolveVersion,
  parseSvgText,
  Icon,
  IconChooserResult,
  Element
} from './utils'

describe('resolveVersion', () => {
  it('resolves 5.x', () => {
    expect(resolveVersion('5.x')).toEqual('5.15.3')
  })
  it('resolves 6.x', () => {
    expect(resolveVersion('6.x')).toEqual('6.0.0-beta1')
  })
  it('resolves latest', () => {
    expect(resolveVersion('latest')).toEqual('5.15.3')
  })
  it('resolves 5.15.1', () => {
    expect(resolveVersion('5.15.1')).toEqual('5.15.1')
  })
})

describe('parseSvgText', () => {
  test('duotone double path no classes', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path d="abc"></path><path d="xyz"></path></svg>')
    expect(result).toEqual([ 10, 10, [], null, [ 'abc', 'xyz' ] ])
  })
  test('duotone double path with classes, primary first', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-primary" d="abc"></path><path class="fa-secondary" d="xyz"></path></svg>')
    expect(result).toEqual([ 10, 10, [], null, [ 'abc', 'xyz' ] ])
  })
  test('duotone double path with classes, secondary first', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-secondary" d="xyz"></path><path class="fa-primary" d="abc"></path></svg>')
    expect(result).toEqual([ 10, 10, [], null, [ 'abc', 'xyz' ] ])
  })
  test('duotone single path only primary', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-primary" d="abc"></path></svg>')
    expect(result).toEqual([ 10, 10, [], null, [ 'abc', '' ] ])
  })
  test('duotone single path only secondary', () => {
    const result = parseSvgText('<svg viewBox="0 0 10 10"><path class="fa-secondary" d="xyz"></path></svg>')
    expect(result).toEqual([ 10, 10, [], null, [ '', 'xyz' ] ])
  })
})

describe('IconChooserResult typing', () => {
  test('plain icon', () => {
    const star: Icon = {
      prefix: 'fas',
      iconName: 'star'
    }

    const result: IconChooserResult = star

    expect(result.iconName).toEqual('star')
  })

  // See: https://fontawesome.com/v5.15/how-to-use/on-the-web/styling/layering
  test('layers', () => {
    /*
    <span class="fa-layers fa-fw" style="background:MistyRose">
      <i class="fas fa-circle" style="color:Tomato"></i>
      <i class="fa-inverse fas fa-times" data-fa-transform="shrink-6"></i>
    </span>
    */
    const circle: Icon = {
      prefix: 'fas',
      iconName: 'circle',
      style: "color:Tomato"
    }

    const times: Icon = {
      prefix: 'fas',
      iconName: 'times',
      class: 'fa-inverse',
      transform: 'shrink-6'
    }

    const layeringSpan: Element = {
      tag: 'span',
      class: 'fa-layers fa-fw',
      style: 'background:MistyRose',
      children: [
        circle,
        times
      ]
    }

    const result: IconChooserResult = layeringSpan

    expect(result.tag).toEqual('span')
    expect((result.children[0] as Icon).iconName).toEqual('circle')
  })

  // See: https://fontawesome.com/v5.15/how-to-use/on-the-web/styling/layering
  test('text layer', () => {
    /*
    <span class="fa-layers fa-fw" style="background:MistyRose">
      <i class="fas fa-certificate"></i>
      <span class="fa-layers-text fa-inverse" data-fa-transform="shrink-11.5 rotate--30" style="font-weight:900">NEW</span>
    </span>
    */

    const certificate: Icon = {
      prefix: 'fas',
      iconName: 'certificate'
    }

    const textNew: string = 'NEW'

    const spanNew: Element = {
      tag: 'span',
      class: 'fa-layers-text fa-inverse',
      transform: 'shrink-11.5 rotate--30',
      style: 'font-weight:900',
      children: [
        textNew
      ]
    }

    const layering: Element = {
      tag: 'span',
      class: 'fa-layers fa-fw',
      style: 'background:MistyRose',
      children: [
        certificate,
        spanNew
      ]
    }

    const result: IconChooserResult = layering

    expect((result.children[0] as Icon).iconName).toEqual('certificate')
    expect((result.children[1] as Element).children[0]).toEqual('NEW')
  })

  // See: https://fontawesome.com/v5.15/how-to-use/on-the-web/styling/masking
  test('mask', () => {
    /*
    <i class="fas fa-pencil-alt" data-fa-transform="shrink-10 up-.5" data-fa-mask="fas fa-comment" style="background:MistyRose"></i>
    */
    const maskedPencil: Icon = {
      prefix: 'fas',
      iconName: 'pencil-alt',
      transform: 'shrink-10 up-.5',
      mask: {
        prefix: 'fas',
        iconName: 'comment'
      },
      style: "background:MistyRose"
    }

    const result: IconChooserResult = maskedPencil

    expect((result as Icon).mask.iconName).toEqual('comment')
  })
})
