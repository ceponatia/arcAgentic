import { getFilteredHierarchy, REGION_GROUPS, getRecordOptional, setPartialRecord } from '@arcagentic/schemas';
/**
 * Prunes a BodyMap by removing keys that are not valid for the given race and gender.
 * Uses the shared hierarchy logic to determine valid regions.
 *
 * @param body - The current body map
 * @param race - The character's race
 * @param gender - The character's gender
 * @returns A new BodyMap with invalid keys removed
 */
export const pruneBodyMap = (body, race, gender) => {
    const filteredHierarchy = getFilteredHierarchy(race, gender);
    const validRegions = new Set();
    // Collect all valid regions from the hierarchy
    Object.values(filteredHierarchy).forEach((subRegions) => {
        subRegions.forEach((sub) => {
            validRegions.add(sub);
            // Also add group members if this sub-region is a group (e.g. 'arms' -> 'leftArm', 'rightArm')
            const groupMembers = getRecordOptional(REGION_GROUPS, sub);
            if (groupMembers) {
                groupMembers.forEach((member) => validRegions.add(member));
            }
        });
    });
    // Also add top-level regions (like 'head', 'torso') if they have valid children
    Object.keys(filteredHierarchy).forEach((region) => {
        validRegions.add(region);
    });
    // Always keep 'skin' and 'overall' as they are meta-regions
    validRegions.add('skin');
    validRegions.add('overall');
    const pruned = {};
    Object.entries(body).forEach(([key, data]) => {
        if (validRegions.has(key)) {
            setPartialRecord(pruned, key, data);
        }
    });
    return pruned;
};
