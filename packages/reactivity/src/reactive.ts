import { isObject, toTypeString } from '@vue/shared'
import { mutableHandlers, readonlyHandlers } from './baseHandlers'

import {
  mutableCollectionHandlers,
  readonlyCollectionHandlers
} from './collectionHandlers'

import { UnwrapNestedRefs } from './ref'
import { ReactiveEffect } from './effect'

// The main WeakMap that stores {target -> key -> dep} connections.
// Conceptually, it's easier to think of a dependency as a Dep class
// which maintains a Set of subscribers, but we simply store them as
// raw Sets to reduce memory overhead.
export type Dep = Set<ReactiveEffect>
export type KeyToDepMap = Map<string | symbol, Dep>

// target 数据源 表
export const targetMap = new WeakMap<any, KeyToDepMap>()

// WeakMaps that store {raw <-> observed} pairs.

/**
 * 可以理解为 落库记录
 * 响应式对象为key，记录 响应式
 */
const rawToReactive = new WeakMap<any, any>()

/**
 * 可以理解为 落库记录
 * 响应式对象为key，原始对象为value
 */
const reactiveToRaw = new WeakMap<any, any>()
const rawToReadonly = new WeakMap<any, any>()
// 只读proxy
const readonlyToRaw = new WeakMap<any, any>()

// WeakSets for values that are marked readonly or non-reactive during
// observable creation.
const readonlyValues = new WeakSet<any>()
const nonReactiveValues = new WeakSet<any>()

// 引用类型
const collectionTypes = new Set<Function>([Set, Map, WeakMap, WeakSet])
const observableValueRE = /^\[object (?:Object|Array|Map|Set|WeakMap|WeakSet)\]$/

// 白名单
const canObserve = (value: any): boolean => {
  return (
    !value._isVue &&
    !value._isVNode &&
    observableValueRE.test(toTypeString(value)) &&
    !nonReactiveValues.has(value)
  )
}

export function reactive<T extends object>(target: T): UnwrapNestedRefs<T>
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  // 如果试图观察只读代理，则返回只读版本。
  if (readonlyToRaw.has(target)) {
    return target
  }
  // target is explicitly marked as readonly by user
  // 目标被用户显式标记为只读
  if (readonlyValues.has(target)) {
    return readonly(target)
  }
  return createReactiveObject(
    target,
    rawToReactive,
    reactiveToRaw,
    mutableHandlers,
    mutableCollectionHandlers
  )
}

export function readonly<T extends object>(
  target: T
): Readonly<UnwrapNestedRefs<T>> {
  // value is a mutable observable, retrieve its original and return
  // a readonly version.
  if (reactiveToRaw.has(target)) {
    target = reactiveToRaw.get(target)
  }
  return createReactiveObject(
    target,
    rawToReadonly,
    readonlyToRaw,
    readonlyHandlers,
    readonlyCollectionHandlers
  )
}

function createReactiveObject(
  // 目标
  target: any,
  // rawToReactive
  toProxy: WeakMap<any, any>,
  // reactiveToRaw
  toRaw: WeakMap<any, any>,
  // mutableHandlers
  baseHandlers: ProxyHandler<any>,
  // mutableCollectionHandlers
  collectionHandlers: ProxyHandler<any>
) {
  // 必须是个对象
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target already has corresponding Proxy
  // target 已经有相应的代理
  let observed = toProxy.get(target)
  if (observed !== void 0) {
    return observed
  }
  // target is already a Proxy
  // 如果它已经 在代理集合中出现
  if (toRaw.has(target)) {
    return target
  }
  // only a whitelist of value types can be observed.
  // 只能观察值类型的白名单。
  if (!canObserve(target)) {
    return target
  }

  // 是否是 Set, Map, WeakMap, WeakSet，几种类型，如果是的话，采用集合处理方式，否则采用基础处理方式
  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers
  // 给它挂上代理
  observed = new Proxy(target, handlers)
  // rawToReactive 记录当前 target 和 响应式，相当于 落库.
  toProxy.set(target, observed)
  // reactiveToRaw  以 响应式对象为key，记录 响应式
  toRaw.set(observed, target)
  if (!targetMap.has(target)) {
    targetMap.set(target, new Map())
  }
  return observed
}

export function isReactive(value: any): boolean {
  return reactiveToRaw.has(value) || readonlyToRaw.has(value)
}

export function isReadonly(value: any): boolean {
  return readonlyToRaw.has(value)
}

export function toRaw<T>(observed: T): T {
  return reactiveToRaw.get(observed) || readonlyToRaw.get(observed) || observed
}

export function markReadonly<T>(value: T): T {
  readonlyValues.add(value)
  return value
}

export function markNonReactive<T>(value: T): T {
  nonReactiveValues.add(value)
  return value
}
