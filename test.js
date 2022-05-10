import { FlagManager } from './FlagManager.js'
import test from 'ava'

const runFlagTests = (t, fm) => {
  // set green flag for all
  const green = fm.flag('green')
  fm.setAll(green)
  const isGreen = fm.has(green)
  t.assert(isGreen(0))
  t.assert(isGreen(9))

  // set some to red
  const red = fm.flag('red')
  const reds = new Set([0, 5, 9])
  const isRed = fm.has(red)
  fm.set(red, ...reds)
  t.assert(isRed(0), "0 must be red")
  t.assert(isRed(9), "9 must be red")
  t.assert(!isRed(1), "1 is not set to red")

  // set 0 and 1 to not green
  fm.clear(green, 0, 1)
  t.assert(!isGreen(0), "0 is not green anymore!")
  t.assert(!isGreen(1), "1 is not green anymore!")
  t.assert(isGreen(2), "2 is still green.")

  const yellow = fm.flag('green') | fm.flag('red')
  const isYellow = fm.hasAll(yellow)
  const redOrGreen = fm.has(yellow)
  t.assert(!isYellow(0), "0 has red but no green it's not yellow")
  t.assert(!isYellow(1), "1 has neither red nor green it's not yellow")
  t.assert(!isYellow(3), "3 has green but no red it's not yellow")
  t.assert(isYellow(5), "5 has both green and red, it must be yellow")
  t.assert(isYellow(9), "9 has both green and red, it must be yellow")
  t.assert(redOrGreen(0), "0 has red it's one of them")
  t.assert(!redOrGreen(1), "1 has neither red nor green it's none of them")
  t.assert(redOrGreen(3), "3 has green it's one of them")

  t.assert(!isRed(10), 'out of bounds access is always false')

  // Two sets are the same
  let oldsameSet = (a, b) => a.size === b.size && [...a].every(value => b.has(value));
  t.assert(oldsameSet(new Set(), new Set()), "nullarrays are same")
  t.assert(oldsameSet(new Set([1,2]), new Set([1,2])), "same arrays are same")
  t.assert(oldsameSet(new Set([2,1]), new Set([1,2])), "order indifferent")
  t.assert(!oldsameSet(new Set([1]), new Set([1,2])), "different size")
  t.assert(!oldsameSet(new Set([1,3]), new Set([1,2])), "different elements")


  const sameSet = (a, b) => t.is(a.size, b.size) && [...a].every(value => t.assert(b.has(value)));

  const blue = fm.flag('blue')
  const blues = new Set([1, 5, 6, 7])
  fm.set(blue, ...blues)

  const reds2 = new Set(fm.filterAny(red))
  sameSet(reds2, new Set(reds), "filterAny must return reds")

  let real, check
  real = new Set(fm.filterAny(yellow))
  check = new Set([0,2,3,4,5,6,7,8,9])
  sameSet(real, check, "filterAny yellow must return all except 1")

  real = new Set(fm.filterAll(yellow))
  check = new Set([5, 9])
  sameSet(real, check, "filterAll yellow is 5 and 9")

  // this is same as filterAll(yellow|blue)
  real = new Set(fm.filter(x => (x & yellow) && (x & blue)))
  check = new Set([5,6,7])
  sameSet(real, check, "custom filter check")

  // removing a flag shouldn't change the others
  fm.remove('green')
  const purple = fm.flag('blue') | fm.flag('red')
  real = new Set(fm.filterAny(purple))
  check = new Set([...blues, ...reds])
  sameSet(real, check, "after removing green, red|blue correctly calculated")

  real = new Set(fm.filterAll(purple))
  check = new Set([...blues].filter(b => reds.has(b)))
  sameSet(real, check, "after removing green, purples should be correctly calculated")
}

test("Standard flag API", t => {
  const fm = new FlagManager(10)
  t.assert(fm.size === 10, "size should match")
  runFlagTests(t, fm)
})

test("Test multiply flags", t => {
  // many flags should work
  const fm = new FlagManager(10)
  for(let i=0; i<9; i++) fm.flag('flag' + i)
  runFlagTests(t, fm)

  for(let i=0; i<50; i++) fm.flag('flag' + i)
  runFlagTests(t, fm)
})

