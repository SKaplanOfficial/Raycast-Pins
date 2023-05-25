import { getSelectedText } from "@raycast/api"
import { Clipboard } from "@raycast/api"

export const usePlaceholders = () => {
    const placeholders: { [key: string]: (str: string) => Promise<string> } = {
        "{{clipboardText}}": async (str: string) => {
            return await Clipboard.readText() || ""
        },
        "{{selectedText}}": async (str: string) => {
            return await getSelectedText() || ""
        },
    }
    
    const applyToString = async (str: string) => {
        let subbedStr = str
        const placeholderDefinition = Object.entries(placeholders)
        for (const [key, placeholder] of placeholderDefinition) {
            subbedStr = subbedStr.replace(new RegExp(key, "g"), await placeholder(str))
        }
        return subbedStr
    }

    const applyToStrings = async (strs: string[]) => {
        const subbedStrs: string[] = []
        for (const str of strs) {
            subbedStrs.push(await applyToString(str))
        }
        return subbedStrs
    }

    const applyToObjectValueWithKey = async (obj: { [key: string]: unknown }, key: string) => {
        const value = obj[key]
        if (typeof value === "string") {
            return await applyToString(value)
        } else if (Array.isArray(value)) {
            return await applyToStrings(value)
        } else if (typeof value === "object") {
            return await applyToObjectValuesWithKeys(value as { [key: string]: unknown }, Object.keys(value as { [key: string]: unknown }))
        } else {
            return value
        }
    }

    const applyToObjectValuesWithKeys = async (obj: { [key: string]: unknown }, keys: string[]) => {
        const subbedObj: { [key: string]: unknown } = {}
        for (const key of keys) {
            subbedObj[key] = await applyToObjectValueWithKey(obj, key)
        }
        return subbedObj
    }

    return {
        placeholders: placeholders,
        applyToString: applyToString,
        applyToStrings: applyToStrings,
        applyToObjectValueWithKey: applyToObjectValueWithKey,
        applyToObjectValuesWithKeys: applyToObjectValuesWithKeys,
    }
}