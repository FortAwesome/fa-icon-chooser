import { resolveVersion, parseSvgText } from './utils'

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
