import * as Y from "yjs"
import { failure } from "../../error/failure"
import { YjsStructure } from "../yjsTypes/types"
import { assertIsYjsStructure } from "../yjsTypes/checks"

/**
 * @internal
 */
export function resolveYjsStructurePath(
  yjsObject: YjsStructure,
  path: readonly (string | number)[]
): YjsStructure {
  let target = yjsObject
  assertIsYjsStructure(target)

  path.forEach((pathSegment) => {
    if (target instanceof Y.Array) {
      target = target.get(+pathSegment) as YjsStructure
      assertIsYjsStructure(target)
    } else if (target instanceof Y.Map) {
      target = target.get(String(pathSegment)) as YjsStructure
      assertIsYjsStructure(target)
    } else {
      throw failure("unsupported y.js data structure")
    }
  })

  return target
}
