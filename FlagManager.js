/*
Managing custom flags

API demo:
const fm = new FlagManager(1000)
const sea = fm.flag('sea')
fm.set(sea, 56)
fm.set(sea, 100)

const river = fm.flag('river')
fm.set(river, 56)
fm.set(river, 110)

...later
const sea = fm.flag('sea')
const river = fm.flag('river')
for(id of fm.all(sea | river)) console.log('both', id)
*/

export class FlagManager {
  constructor(size) {
    this.size = size
    this.stripSize = 8
    this.flagMap = new Uint8Array(size)
    this.flags = {}
  }

  register(flagName) {
    /* Add new flag, return the flag*/
    let nextFree = 0
    const used = Object.values(this.flags)
    while (used.includes(nextFree)) nextFree++
    if (nextFree >= this.stripSize) this.resize()
    this.flags[flagName] = nextFree
    return this.flag(flagName)
  }

  remove(flagName) { // :void
    /* remove the flag*/
    if (this.flags[flagName] === undefined) return
    const mask = this.flag(flagName)
    this.clearAll(mask)
    delete this.flags[flagName]
  }

  flag(flagName) {
    /* get the desired flag mask */
    if (this.flags[flagName] === undefined) return this.register(flagName)
    return this.stripSize === 64
      ? 1n << BigInt(this.flags[flagName])
      : 1 << this.flags[flagName]
  }

  set(mask, ...ids) {
    for (const id of ids) this.flagMap[id] |= mask
  }

  setAll(mask) {
    for (let i=0; i<this.size; i++) this.flagMap[i] |= mask
  }

  clear(mask, ...ids) {
    for (const id of ids) {
      this.flagMap[id] &= ~mask
    }
  }

  clearAll(mask) {
    for (let i=0; i<this.size; i++) this.flagMap[i] &= ~mask
  }

  /* ------------------ tests ------------------- */
  has(mask) {
    return id => this.flagMap[id] && (this.flagMap[id] & mask)
  }

  hasAll(mask) {
    return id => this.flagMap[id] && (this.flagMap[id] & mask) === mask
  }

  hasNot(mask) {
    return id => this.flagMap[id] && !(~this.flagMap[id] & mask)
  }

  * filterAny(mask) {
    for (let c=0; c<this.size; c++)
      if (this.flagMap[c] & mask) yield c
  }

  * filterAll(mask) {
    for (let c=0; c<this.size; c++)
      if ((this.flagMap[c] & mask) === mask) yield c
  }

  * filter(f) {
    for (let c=0; c<this.size; c++)
      if (f(this.flagMap[c])) yield c
  }

  resize() {
    /* resize internal bitmap if required */
    const stripTypes = {
      16: Uint16Array,
      32: Uint32Array,
      64: BigUint64Array,
    }

    this.stripSize = this.stripSize * 2
    const newType = stripTypes[this.stripSize]
    if (! newType)
      throw new Error("Maximum flag number reached. Flag registration rejected.")

    const newFlags = new newType(this.size)
    if (this.stripSize >= 64)
      this.flagMap.forEach((v,i) => newFlags[i] = BigInt(v))
    else
      this.flagMap.forEach((v,i) => newFlags[i] = v)
    this.flagMap = newFlags
  }
}


export class LegacyFlagManager {
  constructor(size) {
    this.size = size
    this.flags = {}
    this.maps = {}
  }

  /* Add new flag, return the flag*/
  register(flagName, legacyMap) {
    const flagNum = Object.keys(this.flags).length
    const nextFlagMask = 1 << flagNum
    this.flags[flagName] = nextFlagMask
    this.maps[flagName] = legacyMap
    return nextFlagMask
  }

  /* get the desired flag mask */
  flag(flagName) {
    const mask = this.flags[flagName]
    if (!mask)
      throw new Error(`Flag "${flagName}" must be registered before usage (legacy).`)
    return mask
  }

  // convert mask to backend storages
  // returns generator of storages
  _getStorages(mask) {
    const oi = iter(this.flags.filter)
    const isTrue = ([_, v]) => v & mask
    return map(snd, filter(isTrue, oi))
  }

  set(mask, id) {
    for (storage of this._getStorages(mask)) storage[id] = true
  }

  clear(mask, id) {
    for (storage of this._getStorages(mask)) storage[id] = false
  }

  has(mask, id) {
    const storages = this._getStorages(mask)
    return reduce((cont, s) => s[id] && cont, storages, false)
  }


  resize() {
    /* resize internal bitmap if required */
    const stripTypes = {
      16: Uint16Array,
      32: Uint32Array,
      64: BigUint64Array,
    }

    this.stripSize = this.stripSize << 1
    const newType = stripTypes[this.stripSize]
    if (! newType)
      throw new Error("Maximum flag number reached. Flag registration rejected.")

    const newFlags = new newType(this.size)
    this.flagMap.forEach((v,i) => newFlags[i] = v)
    this.flagMap = newFlags
  }
}
