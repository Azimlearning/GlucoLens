# Glycemic Index reference for common Malaysian foods
# Source: International GI tables + Malaysian Dietary Guidelines

GI_INDEX: dict[str, int] = {
    # Rice & grains
    "white rice": 72,
    "brown rice": 50,
    "nasi lemak": 68,
    "nasi goreng": 65,
    "nasi kandar": 70,
    "roti canai": 82,
    "roti wholemeal": 49,
    "mee goreng": 61,
    "char kway teow": 58,
    "laksa": 52,
    "bihun goreng": 60,
    "oats": 55,
    "bread white": 75,
    # Proteins
    "ayam goreng": 0,
    "ikan bakar": 0,
    "daging rendang": 0,
    "telur": 0,
    "tauhu": 15,
    "tempe": 41,
    # Vegetables
    "kangkung": 15,
    "bayam": 15,
    "bendi": 15,
    "sayur campur": 15,
    # Fruits
    "pisang": 51,
    "epal": 36,
    "tembikai": 72,
    "betik": 60,
    "mangga": 51,
    # Snacks & drinks
    "teh tarik": 45,
    "milo": 55,
    "kuih": 65,
    "karipap": 60,
    "curry puff": 60,
    # Soups & curries
    "sup tulang": 20,
    "dal": 39,
    "masak lemak": 55,
}


def get_gi(dish_name: str) -> int:
    name_lower = dish_name.lower()
    for key, gi in GI_INDEX.items():
        if key in name_lower or name_lower in key:
            return gi
    return 55  # default medium GI when unknown
