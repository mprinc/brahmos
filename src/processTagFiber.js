import { TAG_ELEMENT_NODE, ATTRIBUTE_NODE } from './brahmosNode';
import { linkEffect, createAndLink, cloneChildrenFibers } from './fiber';
import getTagNode from './TagNode';
import TemplateNode from './TemplateNode';
import { loopEntries } from './utils';
import { RESERVED_ATTRIBUTES, MODIFIED_ATTRIBUTES } from './configs';

export function isAttrOverridden(tagAttrs, attrName, attrIndex) {
  const lastIndex = tagAttrs.lastIndexOf(attrName);
  // if attrIndex is before the last attribute with same name it means its overridden
  return attrIndex <= lastIndex;
}

export function attributeNode(attributes, ref) {
  return {
    nodeType: ATTRIBUTE_NODE,
    attributes,
    ref,
  };
}

export function partsToFiber(parts, values, parentFiber) {
  let refFiber = parentFiber;
  let oldChildFiber = parentFiber.child;

  for (let i = 0, ln = parts.length; i < ln; i++) {
    let part = parts[i];
    const value = values[i];

    const { isAttribute, isNode } = part;

    let node;

    if (isAttribute) {
      const { domNode } = part;

      // mix all the consecutive attributes if they belong to same domNode
      const dynamicAttributes = {};
      let refValue;
      while (part && domNode === part.domNode) {
        loopEntries(values[i], (attrName, attrValue) => {
          const overrideAttrNameCheck = MODIFIED_ATTRIBUTES[attrName];
          const isOverridden = isAttrOverridden(
            part.tagAttrs,
            overrideAttrNameCheck,
            part.attrIndex,
          );
          if (!isOverridden && !RESERVED_ATTRIBUTES[attrName]) {
            dynamicAttributes[attrName] = attrValue;
          } else if (attrName === 'ref') {
            // Note only functional refs are supported
            refValue = attrValue;
            // TODO: Handle refs
            // setRef(attrValue, domNode);
          }
        });
        part = parts[++i];
      }

      // reduce the counter to correct the loop index. As it is extra incremented in while loop
      i--;
      part = parts[i];

      node = attributeNode(dynamicAttributes, refValue);

      // TODO: Put updateNodeAttributes as an effect
      // updateNodeAttributes(domNode, dynamicAttributes, oldDynamicAttributes, isSvgPart);
    } else if (isNode) {
      node = value;
    }

    /**
     * create a fiber from node and link it to reference fiber
     */
    // get the current old fiber
    refFiber = createAndLink(node, part, oldChildFiber, refFiber, parentFiber);

    // set the next old child to oldChildFiber
    oldChildFiber = oldChildFiber && oldChildFiber.sibling;
  }
}

/**
 * Update tagged template node
 */
export default function processTagFiber(fiber) {
  let { node } = fiber;
  const {
    part,
    alternate,
    parent: { context },
  } = fiber;

  const oldNode = alternate && alternate.node;
  const { values, nodeType } = node;

  const isTagElement = nodeType === TAG_ELEMENT_NODE;

  // if the node is an svg element, or fiber is already mentioned as svgPart set the isSvgPart true
  const isSvgPart = fiber.isSvgPart || (isTagElement && node.element === 'svg');

  // store isSvgPart info back to fiber, this will be forwarded to children
  fiber.isSvgPart = isSvgPart;

  /**
   * if the node already has templateNode, and node reference is different from oldNode,
   * it means the node is already being used somewhere, so duplicate the node
   */
  if (node.templateNode && node !== oldNode) {
    node = { ...node, templateNode: null };
    // store the new node back to fiber
    fiber.node = node;
  }

  // if new node and old node share same template we can reuse the templateNode instance
  if (oldNode && oldNode.template === node.template) {
    node.templateNode = oldNode.templateNode;
  }

  let { templateNode } = node;

  /**
   * if you don't get the old template node it means you have to render the node first time
   * in such cases delete the nodes where the template node is supposed to be present.
   */
  if (!templateNode) {
    templateNode = isTagElement
      ? getTagNode(node, isSvgPart)
      : new TemplateNode(node.template, isSvgPart);

    // add templateNode to node so we can access it on next updates
    node.templateNode = templateNode;
  }

  /**
   * if any of templateNode part does not have proper parent node and its not first render
   * patch the part information using the current node's part
   * This can happen if the parent node is fragment, or it is the first or last item
   */
  if (!isTagElement) {
    templateNode.patchParts(part);
  }

  /**
   * Associate parts to fiber.
   * No need to perform this if node and oldNode are same
   * This will only happen when we are just doing position change
   * In which case just clone the children fibers
   */
  if (node !== oldNode) {
    partsToFiber(templateNode.parts, values, fiber);
  } else {
    cloneChildrenFibers(fiber);
  }

  // mark this node to be updated or to get appended as a effect
  linkEffect(fiber);

  // attach context on fiber
  fiber.context = context;
}
