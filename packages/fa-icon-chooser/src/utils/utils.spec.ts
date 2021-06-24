import { resolveVersion } from './utils'

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
