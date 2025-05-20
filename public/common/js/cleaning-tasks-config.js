// public/common/js/cleaning-tasks-config.js

const PREDEFINED_CLEANING_TASKS = {
    general: [
        { id: 'dust_surfaces', label: 'Dust Surfaces (tables, shelves, decor)' },
        { id: 'vacuum_carpets_rugs', label: 'Vacuum Carpets/Rugs' },
        { id: 'sweep_hard_floors', label: 'Sweep Hard Floors' },
        { id: 'mop_hard_floors', label: 'Mop Hard Floors' },
        { id: 'empty_trash_bins', label: 'Empty Trash Bins' },
        { id: 'wipe_light_switches_door_knobs', label: 'Wipe Light Switches & Door Knobs' },
        { id: 'dust_baseboards', label: 'Dust Baseboards' },
        { id: 'clean_windows_interior_quick', label: 'Clean Windows (Interior - Quick Wipe)' },
        { id: 'dust_window_sills_ledges', label: 'Dust Window Sills & Ledges' },
        { id: 'remove_cobwebs', label: 'Remove Cobwebs' },
        { id: 'dust_ceiling_fans', label: 'Dust Ceiling Fans (if reachable)' },
        { id: 'dust_blinds_shutters', label: 'Dust Blinds/Shutters' },
        { id: 'spot_clean_walls_doors', label: 'Spot Clean Walls/Doors (for marks)' },
        { id: 'tidy_straighten_items', label: 'Tidy & Straighten Items' }
    ],
    kitchen: [
        { id: 'clean_kitchen_countertops', label: 'Clean Countertops' },
        { id: 'clean_kitchen_sink_faucets', label: 'Clean Sink & Faucets' },
        { id: 'clean_exterior_kitchen_cabinets', label: 'Clean Exterior of Cabinets' },
        { id: 'clean_exterior_refrigerator', label: 'Clean Exterior of Refrigerator' },
        { id: 'clean_exterior_oven', label: 'Clean Exterior of Oven' },
        { id: 'clean_exterior_dishwasher', label: 'Clean Exterior of Dishwasher' },
        { id: 'clean_stovetop', label: 'Clean Stovetop' },
        { id: 'clean_microwave_interior_exterior', label: 'Clean Microwave (Interior & Exterior)' },
        { id: 'load_unload_dishwasher', label: 'Load/Unload Dishwasher (if requested)' },
        { id: 'wipe_kitchen_table_chairs', label: 'Wipe Down Kitchen Table & Chairs' }
    ],
    bathroom: [
        { id: 'clean_bathroom_countertops', label: 'Clean Countertops' },
        { id: 'clean_bathroom_sink_faucets', label: 'Clean Sink(s) & Faucets' },
        { id: 'clean_disinfect_toilet', label: 'Clean & Disinfect Toilet (bowl, seat, base)' },
        { id: 'clean_shower_tub', label: 'Clean Shower/Tub (walls, floor, fixtures)' },
        { id: 'clean_shower_doors', label: 'Clean Shower Doors' },
        { id: 'clean_bathroom_mirrors', label: 'Clean Mirrors' },
        { id: 'wipe_exterior_bathroom_cabinets', label: 'Wipe Exterior of Cabinets' },
        { id: 'change_towels', label: 'Change Towels (if requested)' }
    ],
    bedroom: [
        { id: 'make_beds', label: 'Make Bed(s)' },
        { id: 'change_bed_linens', label: 'Change Bed Linens (if requested)' },
        { id: 'dust_bedroom_furniture', label: 'Dust Furniture (dressers, nightstands)' },
        { id: 'tidy_bedroom', label: 'Tidy Room' }
    ],
    living_common: [
        { id: 'dust_living_furniture', label: 'Dust Furniture' },
        { id: 'vacuum_upholstered_furniture', label: 'Vacuum Upholstered Furniture' },
        { id: 'fluff_straighten_cushions_pillows', label: 'Fluff/Straighten Cushions & Pillows' }
    ],
    addon_deep_clean: [
        { id: 'clean_inside_refrigerator', label: 'Clean Inside Refrigerator' },
        { id: 'clean_inside_oven', label: 'Clean Inside Oven' },
        { id: 'clean_inside_cabinets_drawers', label: 'Clean Inside Cabinets/Drawers' },
        { id: 'clean_interior_windows_thorough', label: 'Clean Interior Windows (Thorough)' },
        { id: 'wash_baseboards', label: 'Wash Baseboards' },
        { id: 'clean_window_tracks', label: 'Clean Window Tracks' },
        { id: 'clean_light_fixtures_detailed', label: 'Clean Light Fixtures (Detailed)' },
        { id: 'clean_vents_detailed', label: 'Clean Vents (Detailed)' },
        { id: 'clean_walls_full', label: 'Clean Walls (Full - not just spot clean)' },
        { id: 'clean_sliding_glass_door_tracks', label: 'Clean Sliding Glass Door Tracks' },
        { id: 'patio_balcony_sweeping', label: 'Patio/Balcony Sweeping' },
        { id: 'laundry_wash_dry_fold', label: 'Laundry (Wash, Dry & Fold - per load)' },
        { id: 'organize_pantry_closets', label: 'Organize Specific Areas (e.g., pantry, closets)' }
    ]
};

// To make it accessible in other scripts if they are not modules,
// you might attach it to the window object, or ensure scripts are loaded as modules.
// For now, assuming module usage or appropriate script loading order.
// Example for non-module global access (use with caution):
// if (typeof window !== 'undefined') {
//     window.PREDEFINED_CLEANING_TASKS = PREDEFINED_CLEANING_TASKS;
// } 