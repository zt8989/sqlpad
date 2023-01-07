import _ from "lodash";
import { CollectionType } from "./types";

function toCollectionTypeInner(str: string | null): CollectionType[] | string[]{
  if (_.trim(str || "")) {
    try {
      const list = JSON.parse(str!);
      return list.data || [];
    } catch (err) {}
  }
  return [];
}

/**
 * 兼容旧版
 * @param str 
 * @returns 
 */
export function toCollectionType(str: string | null): CollectionType[]{
  const collection = toCollectionTypeInner(str)
  if(collection.length > 0 && !_.isString(collection[0])){
    return collection as CollectionType[]
  }
  return []
}