import * as Y from "yjs"
import { setupNodeToYjsReplication } from "./nodeToYjs/setupNodeToYjsReplication"
import { createNodeFromYjsObject } from "./yjsToNode/createNodeFromYjsObject"
import { setupYjsToNodeReplication } from "./yjsToNode/setupYjsToNodeReplication"
import { YjsStructure } from "./yjsTypes/types"
import { action } from "mobx"
import { walkTree, WalkTreeMode } from "../node/tree/walkTree"
import { initNode } from "../node/onNodeInit"
import { Dispose } from "../utils/disposeOnce"
import { getParentToChildPath } from "../node/tree/getParentToChildPath"
import { resolveYjsStructurePath } from "./nodeToYjs/resolveYjsStructurePath"

/**
 * Creates a node that is bound to a Y.js data structure.
 * Y.js Map and Array instances are bound to MobX objects and arrays, respectively.
 */
export const bindYjsToNode = action(
  <T extends object>({
    yjsDoc,
    yjsObject,
    yjsOrigin,
  }: {
    /**
     * The Y.js document.
     */
    yjsDoc: Y.Doc

    /**
     * The Y.js data structure to bind.
     */
    yjsObject: YjsStructure

    /**
     * The Y.js origin symbol used for binding transactions.
     * One will be automatically generated if not provided.
     */
    yjsOrigin?: symbol
  }): {
    /**
     * The bound node.
     */
    node: T

    /**
     * Resolves the corresponding YjsStructure for a given target node.
     *
     * @param node - The node to resolve in the bound Yjs structure.
     * @returns The resolved YjsStructure.
     * @throws Error if the target node is not found in the bound tree.
     */
    getYjsObjectForNode: (node: object) => YjsStructure

    /**
     * Disposes the binding.
     */
    dispose: Dispose
  } => {
    yjsOrigin = yjsOrigin ?? Symbol("mobx-bonsai-yjs-origin")

    const node = createNodeFromYjsObject<T>(yjsObject)

    const yjsReplicatingRef = { current: 0 }

    const yjsToNodeReplicationAdmin = setupYjsToNodeReplication({
      node: node,
      yjsObject,
      yjsOrigin,
      yjsReplicatingRef,
    })

    const nodeToYjsReplicationAdmin = setupNodeToYjsReplication({
      node: node,
      yjsDoc,
      yjsObject,
      yjsOrigin,
      yjsReplicatingRef,
    })

    // run node initialization callbacks here, later, to sync changes
    walkTree(
      node,
      (n) => {
        initNode(n)
      },
      WalkTreeMode.ChildrenFirst
    )

    return {
      node,

      getYjsObjectForNode: (target: object) => {
        if (target === node) {
          return yjsObject
        }
        const path = getParentToChildPath(node, target)
        if (!path) {
          throw new Error("node not found in the bound tree")
        }
        return resolveYjsStructurePath(yjsObject, path)
      },

      dispose: () => {
        nodeToYjsReplicationAdmin.dispose()
        yjsToNodeReplicationAdmin.dispose()
      },
    }
  }
)
