/**
 * @file number-words.ts
 * @description This file exports a constant `numberWordMaps` which contains mappings of number words
 * (e.g., "one", "two", "cento") to their numerical equivalents for various supported languages.
 * This is used by the SpeechToNumberComponent to convert spoken number words into digits.
 * Each language has its own map, and each map includes common number words and their numeric values
 * up to 200, including variations in spelling or phrasing (e.g., "twenty one" vs "twenty-one").
 * It also includes direct string-to-number mapping for digits like "0" to 0, "1" to 1, etc., for each language.
 */

/**
 * @constant numberWordMaps
 * @type {{ [key: string]: { [word: string]: number } }}
 * @description A multi-language dictionary mapping spoken number words to their numeric values.
 * The outer keys are language codes (e.g., 'en', 'it', 'es', 'fr', 'de', 'ar', 'ja').
 * Each inner object is a dictionary where keys are number words (strings) and values are their corresponding numbers.
 * This includes:
 *  - Standard number words (e.g., "zero", "one", "eleven", "twenty", "hundred").
 *  - Compound numbers (e.g., "twenty-one", "one hundred and one").
 *  - Variations in phrasing (e.g., "twenty one" vs "twenty-one", "cento uno" vs "centouno").
 *  - Numeric strings (e.g., "0", "1", "10", "100") to their integer values.
 *  - For Arabic, includes both standard Arabic numerals and Eastern Arabic numerals.
 *  - For Japanese, includes Hiragana, Katakana, and Kanji representations of numbers.
 *
 * Supported languages and their specific considerations:
 * - **en (English):** Covers numbers 0-200, including hyphenated and non-hyphenated forms.
 * - **it (Italian):** Covers numbers 0-200, including common single-word and multi-word forms.
 * - **es (Spanish):** Covers numbers 0-200, including forms with "y" and hyphenated alternatives.
 * - **fr (French):** Covers numbers 0-200, including specific French numbering rules (e.g., "soixante-dix", "quatre-vingts").
 * - **de (German):** Covers numbers 0-200, including compound words like "einundzwanzig".
 * - **ar (Arabic):** Covers numbers 0-200, including common word forms and both Western and Eastern Arabic numeral strings.
 * - **ja (Japanese):** Covers numbers 0-200, including Hiragana, Katakana, and Kanji representations, and variations in readings.
 */
export const numberWordMaps: { [key: string]: { [word: string]: number } } = {
  en: { // English
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "twenty-one": 21, "twenty one": 21, "twenty-two": 22, "twenty two": 22, "twenty-three": 23, "twenty three": 23, "twenty-four": 24, "twenty four": 24, "twenty-five": 25, "twenty five": 25, "twenty-six": 26, "twenty six": 26, "twenty-seven": 27, "twenty seven": 27, "twenty-eight": 28, "twenty eight": 28, "twenty-nine": 29, "twenty nine": 29,
    "thirty": 30, "thirty-one": 31, "thirty one": 31, "thirty-two": 32, "thirty two": 32, "thirty-three": 33, "thirty three": 33, "thirty-four": 34, "thirty four": 34, "thirty-five": 35, "thirty five": 35, "thirty-six": 36, "thirty six": 36, "thirty-seven": 37, "thirty seven": 37, "thirty-eight": 38, "thirty eight": 38, "thirty-nine": 39, "thirty nine": 39,
    "forty": 40, "forty-one": 41, "forty one": 41, "forty-two": 42, "forty two": 42, "forty-three": 43, "forty three": 43, "forty-four": 44, "forty four": 44, "forty-five": 45, "forty five": 45, "forty-six": 46, "forty six": 46, "forty-seven": 47, "forty seven": 47, "forty-eight": 48, "forty eight": 48, "forty-nine": 49, "forty nine": 49,
    "fifty": 50, "fifty-one": 51, "fifty one": 51, "fifty-two": 52, "fifty two": 52, "fifty-three": 53, "fifty three": 53, "fifty-four": 54, "fifty four": 54, "fifty-five": 55, "fifty five": 55, "fifty-six": 56, "fifty six": 56, "fifty-seven": 57, "fifty seven": 57, "fifty-eight": 58, "fifty eight": 58, "fifty-nine": 59, "fifty nine": 59,
    "sixty": 60, "sixty-one": 61, "sixty one": 61, "sixty-two": 62, "sixty two": 62, "sixty-three": 63, "sixty three": 63, "sixty-four": 64, "sixty four": 64, "sixty-five": 65, "sixty five": 65, "sixty-six": 66, "sixty six": 66, "sixty-seven": 67, "sixty seven": 67, "sixty-eight": 68, "sixty eight": 68, "sixty-nine": 69, "sixty nine": 69,
    "seventy": 70, "seventy-one": 71, "seventy one": 71, "seventy-two": 72, "seventy two": 72, "seventy-three": 73, "seventy three": 73, "seventy-four": 74, "seventy four": 74, "seventy-five": 75, "seventy five": 75, "seventy-six": 76, "seventy six": 76, "seventy-seven": 77, "seventy seven": 77, "seventy-eight": 78, "seventy eight": 78, "seventy-nine": 79, "seventy nine": 79,
    "eighty": 80, "eighty-one": 81, "eighty one": 81, "eighty-two": 82, "eighty two": 82, "eighty-three": 83, "eighty three": 83, "eighty-four": 84, "eighty four": 84, "eighty-five": 85, "eighty five": 85, "eighty-six": 86, "eighty six": 86, "eighty-seven": 87, "eighty seven": 87, "eighty-eight": 88, "eighty eight": 88, "eighty-nine": 89, "eighty nine": 89,
    "ninety": 90, "ninety-one": 91, "ninety one": 91, "ninety-two": 92, "ninety two": 92, "ninety-three": 93, "ninety three": 93, "ninety-four": 94, "ninety four": 94, "ninety-five": 95, "ninety five": 95, "ninety-six": 96, "ninety six": 96, "ninety-seven": 97, "ninety seven": 97, "ninety-eight": 98, "ninety eight": 98, "ninety-nine": 99, "ninety nine": 99,
    "one hundred": 100, "hundred": 100, "one hundred and one": 101, "one hundred one": 101, "one hundred and two": 102, "one hundred two": 102, "one hundred and three": 103, "one hundred three": 103, "one hundred and four": 104, "one hundred four": 104, "one hundred and five": 105, "one hundred five": 105,
    "one hundred and six": 106, "one hundred six": 106, "one hundred and seven": 107, "one hundred seven": 107, "one hundred and eight": 108, "one hundred eight": 108, "one hundred and nine": 109, "one hundred nine": 109, "one hundred and ten": 110, "one hundred ten": 110,
    "one hundred and eleven": 111, "one hundred eleven": 111, "one hundred and twelve": 112, "one hundred twelve": 112, "one hundred and thirteen": 113, "one hundred thirteen": 113, "one hundred and fourteen": 114, "one hundred fourteen": 114, "one hundred and fifteen": 115, "one hundred fifteen": 115,
    "one hundred and sixteen": 116, "one hundred sixteen": 116, "one hundred and seventeen": 117, "one hundred seventeen": 117, "one hundred and eighteen": 118, "one hundred eighteen": 118, "one hundred and nineteen": 119, "one hundred nineteen": 119, "one hundred and twenty": 120, "one hundred twenty": 120,
    "one hundred and twenty-one": 121, "one hundred twenty-one": 121, "one hundred and twenty one": 121, "one hundred twenty one": 121, "one hundred and thirty": 130, "one hundred thirty": 130, "one hundred and forty": 140, "one hundred forty": 140, "one hundred and fifty": 150, "one hundred fifty": 150,
    "one hundred and sixty": 160, "one hundred sixty": 160, "one hundred and seventy": 170, "one hundred seventy": 170, "one hundred and eighty": 180, "one hundred eighty": 180, "one hundred and ninety": 190, "one hundred ninety": 190, "two hundred": 200,
    // Numeric strings
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i]))
  },

  it: { // Italiano
    "zero": 0, "uno": 1, "due": 2, "tre": 3, "quattro": 4, "cinque": 5, "sei": 6, "sette": 7, "otto": 8, "nove": 9, "dieci": 10,
    "undici": 11, "dodici": 12, "tredici": 13, "quattordici": 14, "quindici": 15, "sedici": 16, "diciassette": 17, "diciotto": 18, "diciannove": 19, "venti": 20,
    "ventuno": 21, "ventidue": 22, "ventitré": 23, "ventiquattro": 24, "venticinque": 25, "ventisei": 26, "ventisette": 27, "ventotto": 28, "ventinove": 29,
    "trenta": 30, "trentuno": 31, "trentadue": 32, "trentatré": 33, "trentaquattro": 34, "trentacinque": 35, "trentasei": 36, "trentasette": 37, "trentotto": 38, "trentanove": 39,
    "quaranta": 40, "quarantuno": 41, "quarantadue": 42, "quarantatré": 43, "quarantaquattro": 44, "quarantacinque": 45, "quarantasei": 46, "quarantasette": 47, "quarantotto": 48, "quarantanove": 49,
    "cinquanta": 50, "cinquantuno": 51, "cinquantadue": 52, "cinquantatré": 53, "cinquantaquattro": 54, "cinquantacinque": 55, "cinquantasei": 56, "cinquantasette": 57, "cinquantotto": 58, "cinquantanove": 59,
    "sessanta": 60, "sessantuno": 61, "sessantadue": 62, "sessantatré": 63, "sessantaquattro": 64, "sessantacinque": 65, "sessantasei": 66, "sessantasette": 67, "sessantotto": 68, "sessantanove": 69,
    "settanta": 70, "settantuno": 71, "settantadue": 72, "settantatré": 73, "settantaquattro": 74, "settantacinque": 75, "settantasei": 76, "settantasette": 77, "settantotto": 78, "settantanove": 79,
    "ottanta": 80, "ottantuno": 81, "ottantadue": 82, "ottantatré": 83, "ottantaquattro": 84, "ottantacinque": 85, "ottantasei": 86, "ottantasette": 87, "ottantotto": 88, "ottantanove": 89,
    "novanta": 90, "novantuno": 91, "novantadue": 92, "novantatré": 93, "novantaquattro": 94, "novantacinque": 95, "novantasei": 96, "novantasette": 97, "novantotto": 98, "novantanove": 99,
    "cento": 100, "centouno": 101, "centodue": 102, "centotré": 103, "centoquattro": 104, "centocinque": 105, "centosei": 106, "centosette": 107, "centootto": 108, "centonove": 109, "centodieci": 110,
    "centoundici": 111, "centododici": 112, "centotredici": 113, "centoquattordici": 114, "centoquindici": 115, "centosedici": 116, "centodiciassette": 117, "centodiciotto": 118, "centodiciannove": 119, "centoventi": 120,
    "centoventuno": 121, "centoventidue": 122, "centoventitré": 123, "centoventiquattro": 124, "centoventicinque": 125, "centoventisei": 126, "centoventisette": 127, "centoventotto": 128, "centoventinove": 129, "centotrenta": 130,
    "centotrentuno": 131, "centotrentadue": 132, "centotrentatré": 133, "centotrentaquattro": 134, "centotrentacinque": 135, "centotrentasei": 136, "centotrentasette": 137, "centotrentotto": 138, "centotrentanove": 139, "centoquaranta": 140,
    "centoquarantuno": 141, "centoquarantadue": 142, "centoquarantatré": 143, "centoquarantaquattro": 144, "centoquarantacinque": 145, "centoquarantasei": 146, "centoquarantasette": 147, "centoquarantotto": 148, "centoquarantanove": 149, "centocinquanta": 150,
    "centocinquantuno": 151, "centocinquantadue": 152, "centocinquantatré": 153, "centocinquantaquattro": 154, "centocinquantacinque": 155, "centocinquantasei": 156, "centocinquantasette": 157, "centocinquantotto": 158, "centocinquantanove": 159, "centosessanta": 160,
    "centosessantuno": 161, "centosessantadue": 162, "centosessantatré": 163, "centosessantaquattro": 164, "centosessantacinque": 165, "centosessantasei": 166, "centosessantasette": 167, "centosessantotto": 168, "centosessantanove": 169, "centosettanta": 170,
    "centosettantuno": 171, "centosettantadue": 172, "centosettantatré": 173, "centosettantaquattro": 174, "centosettantacinque": 175, "centosettantasei": 176, "centosettantasette": 177, "centosettantotto": 178, "centosettantanove": 179, "centottanta": 180,
    "centottantuno": 181, "centottantadue": 182, "centottantatré": 183, "centottantaquattro": 184, "centottantacinque": 185, "centottantasei": 186, "centottantasette": 187, "centottantotto": 188, "centottantanove": 189, "centonovanta": 190,
    "centonovantuno": 191, "centonovantadue": 192, "centonovantatré": 193, "centonovantaquattro": 194, "centonovantacinque": 195, "centonovantasei": 196, "centonovantasette": 197, "centonovantotto": 198, "centonovantanove": 199, "duecento": 200,
    // Forme alternative con spazio
    "venti uno": 21, "venti due": 22, "venti tre": 23, "venti quattro": 24, "venti cinque": 25, "venti sei": 26, "venti sette": 27, "venti otto": 28, "venti nove": 29,
    "trenta uno": 31, "trenta due": 32, "trenta tre": 33, "trenta quattro": 34, "trenta cinque": 35, "trenta sei": 36, "trenta sette": 37, "trenta otto": 38, "trenta nove": 39,
    "quaranta uno": 41, "quaranta due": 42, "quaranta tre": 43, "quaranta quattro": 44, "quaranta cinque": 45, "quaranta sei": 46, "quaranta sette": 47, "quaranta otto": 48, "quaranta nove": 49,
    "cinquanta uno": 51, "cinquanta due": 52, "cinquanta tre": 53, "cinquanta quattro": 54, "cinquanta cinque": 55, "cinquanta sei": 56, "cinquanta sette": 57, "cinquanta otto": 58, "cinquanta nove": 59,
    "sessanta uno": 61, "sessanta due": 62, "sessanta tre": 63, "sessanta quattro": 64, "sessanta cinque": 65, "sessanta sei": 66, "sessanta sette": 67, "sessanta otto": 68, "sessanta nove": 69,
    "settanta uno": 71, "settanta due": 72, "settanta tre": 73, "settanta quattro": 74, "settanta cinque": 75, "settanta sei": 76, "settanta sette": 77, "settanta otto": 78, "settanta nove": 79,
    "ottanta uno": 81, "ottanta due": 82, "ottanta tre": 83, "ottanta quattro": 84, "ottanta cinque": 85, "ottanta sei": 86, "ottanta sette": 87, "ottanta otto": 88, "ottanta nove": 89,
    "novanta uno": 91, "novanta due": 92, "novanta tre": 93, "novanta quattro": 94, "novanta cinque": 95, "novanta sei": 96, "novanta sette": 97, "novanta otto": 98, "novanta nove": 99,
    // Numeric strings
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i]))
  },

  es: { // Español
    "cero": 0, "uno": 1, "dos": 2, "tres": 3, "cuatro": 4, "cinco": 5, "seis": 6, "siete": 7, "ocho": 8, "nueve": 9, "diez": 10,
    "once": 11, "doce": 12, "trece": 13, "catorce": 14, "quince": 15, "dieciséis": 16, "diecisiete": 17, "dieciocho": 18, "diecinueve": 19, "veinte": 20,
    "veintiuno": 21, "veintiún": 21, "veintidós": 22, "veintitrés": 23, "veinticuatro": 24, "veinticinco": 25, "veintiséis": 26, "veintisiete": 27, "veintiocho": 28, "veintinueve": 29,
    "treinta": 30, "treinta y uno": 31, "treinta y dos": 32, "treinta y tres": 33, "treinta y cuatro": 34, "treinta y cinco": 35, "treinta y seis": 36, "treinta y siete": 37, "treinta y ocho": 38, "treinta y nueve": 39,
    "cuarenta": 40, "cuarenta y uno": 41, "cuarenta y dos": 42, "cuarenta y tres": 43, "cuarenta y cuatro": 44, "cuarenta y cinco": 45, "cuarenta y seis": 46, "cuarenta y siete": 47, "cuarenta y ocho": 48, "cuarenta y nueve": 49,
    "cincuenta": 50, "cincuenta y uno": 51, "cincuenta y dos": 52, "cincuenta y tres": 53, "cincuenta y cuatro": 54, "cincuenta y cinco": 55, "cincuenta y seis": 56, "cincuenta y siete": 57, "cincuenta y ocho": 58, "cincuenta y nueve": 59,
    "sesenta": 60, "sesenta y uno": 61, "sesenta y dos": 62, "sesenta y tres": 63, "sesenta y cuatro": 64, "sesenta y cinco": 65, "sesenta y seis": 66, "sesenta y siete": 67, "sesenta y ocho": 68, "sesenta y nueve": 69,
    "setenta": 70, "setenta y uno": 71, "setenta y dos": 72, "setenta y tres": 73, "setenta y cuatro": 74, "setenta y cinco": 75, "setenta y seis": 76, "setenta y siete": 77, "setenta y ocho": 78, "setenta y nueve": 79,
    "ochenta": 80, "ochenta y uno": 81, "ochenta y dos": 82, "ochenta y tres": 83, "ochenta y cuatro": 84, "ochenta y cinco": 85, "ochenta y seis": 86, "ochenta y siete": 87, "ochenta y ocho": 88, "ochenta y nueve": 89,
    "noventa": 90, "noventa y uno": 91, "noventa y dos": 92, "noventa y tres": 93, "noventa y cuatro": 94, "noventa y cinco": 95, "noventa y seis": 96, "noventa y siete": 97, "noventa y ocho": 98, "noventa y nueve": 99,
    "cien": 100, "ciento": 100, "ciento uno": 101, "ciento dos": 102, "ciento tres": 103, "ciento cuatro": 104, "ciento cinco": 105, "ciento seis": 106, "ciento siete": 107, "ciento ocho": 108, "ciento nueve": 109, "ciento diez": 110,
    "ciento once": 111, "ciento doce": 112, "ciento trece": 113, "ciento catorce": 114, "ciento quince": 115, "ciento dieciséis": 116, "ciento diecisiete": 117, "ciento dieciocho": 118, "ciento diecinueve": 119, "ciento veinte": 120,
    "ciento veintiuno": 121, "ciento veintiún": 121, "ciento veintidós": 122, "ciento veintitrés": 123, "ciento veinticuatro": 124, "ciento veinticinco": 125, "ciento veintiséis": 126, "ciento veintisiete": 127, "ciento veintiocho": 128, "ciento veintinueve": 129,
    "ciento treinta": 130, "ciento cuarenta": 140, "ciento cincuenta": 150, "ciento sesenta": 160, "ciento setenta": 170, "ciento ochenta": 180, "ciento noventa": 190, "doscientos": 200,
    // Forme con trattino
    "treinta-y-uno": 31, "treinta-y-dos": 32, "treinta-y-tres": 33, "treinta-y-cuatro": 34, "treinta-y-cinco": 35, "treinta-y-seis": 36, "treinta-y-siete": 37, "treinta-y-ocho": 38, "treinta-y-nueve": 39,
    "cuarenta-y-uno": 41, "cuarenta-y-dos": 42, "cuarenta-y-tres": 43, "cuarenta-y-cuatro": 44, "cuarenta-y-cinco": 45, "cuarenta-y-seis": 46, "cuarenta-y-siete": 47, "cuarenta-y-ocho": 48, "cuarenta-y-nueve": 49,
    // Numeric strings
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i]))
  },

  fr: { // Français
    "zéro": 0, "un": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6, "sept": 7, "huit": 8, "neuf": 9, "dix": 10,
    "onze": 11, "douze": 12, "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16, "dix-sept": 17, "dix-huit": 18, "dix-neuf": 19, "vingt": 20,
    "vingt et un": 21, "vingt-deux": 22, "vingt-trois": 23, "vingt-quatre": 24, "vingt-cinq": 25, "vingt-six": 26, "vingt-sept": 27, "vingt-huit": 28, "vingt-neuf": 29,
    "trente": 30, "trente et un": 31, "trente-deux": 32, "trente-trois": 33, "trente-quatre": 34, "trente-cinq": 35, "trente-six": 36, "trente-sept": 37, "trente-huit": 38, "trente-neuf": 39,
    "quarante": 40, "quarante et un": 41, "quarante-deux": 42, "quarante-trois": 43, "quarante-quatre": 44, "quarante-cinq": 45, "quarante-six": 46, "quarante-sept": 47, "quarante-huit": 48, "quarante-neuf": 49,
    "cinquante": 50, "cinquante et un": 51, "cinquante-deux": 52, "cinquante-trois": 53, "cinquante-quatre": 54, "cinquante-cinq": 55, "cinquante-six": 56, "cinquante-sept": 57, "cinquante-huit": 58, "cinquante-neuf": 59,
    "soixante": 60, "soixante et un": 61, "soixante-deux": 62, "soixante-trois": 63, "soixante-quatre": 64, "soixante-cinq": 65, "soixante-six": 66, "soixante-sept": 67, "soixante-huit": 68, "soixante-neuf": 69,
    "soixante-dix": 70, "soixante et onze": 71, "soixante-douze": 72, "soixante-treize": 73, "soixante-quatorze": 74, "soixante-quinze": 75, "soixante-seize": 76, "soixante-dix-sept": 77, "soixante-dix-huit": 78, "soixante-dix-neuf": 79,
    "quatre-vingts": 80, "quatre-vingt-un": 81, "quatre-vingt-deux": 82, "quatre-vingt-trois": 83, "quatre-vingt-quatre": 84, "quatre-vingt-cinq": 85, "quatre-vingt-six": 86, "quatre-vingt-sept": 87, "quatre-vingt-huit": 88, "quatre-vingt-neuf": 89,
    "quatre-vingt-dix": 90, "quatre-vingt-onze": 91, "quatre-vingt-douze": 92, "quatre-vingt-treize": 93, "quatre-vingt-quatorze": 94, "quatre-vingt-quinze": 95, "quatre-vingt-seize": 96, "quatre-vingt-dix-sept": 97, "quatre-vingt-dix-huit": 98, "quatre-vingt-dix-neuf": 99,
    "cent": 100, "cent un": 101, "cent deux": 102, "cent trois": 103, "cent quatre": 104, "cent cinq": 105, "cent six": 106, "cent sept": 107, "cent huit": 108, "cent neuf": 109, "cent dix": 110,
    "cent onze": 111, "cent douze": 112, "cent treize": 113, "cent quatorze": 114, "cent quinze": 115, "cent seize": 116, "cent dix-sept": 117, "cent dix-huit": 118, "cent dix-neuf": 119, "cent vingt": 120,
    "cent vingt et un": 121, "cent vingt-deux": 122, "cent vingt-trois": 123, "cent vingt-quatre": 124, "cent vingt-cinq": 125, "cent vingt-six": 126, "cent vingt-sept": 127, "cent vingt-huit": 128, "cent vingt-neuf": 129,
    "cent trente": 130, "cent quarante": 140, "cent cinquante": 150, "cent soixante": 160, "cent soixante-dix": 170, "cent quatre-vingts": 180, "cent quatre-vingt-dix": 190, "deux cents": 200,
    // Alternative senza trattino
    "dix sept": 17, "dix huit": 18, "dix neuf": 19,
    "vingt deux": 22, "vingt trois": 23, "vingt quatre": 24, "vingt cinq": 25, "vingt six": 26, "vingt sept": 27, "vingt huit": 28, "vingt neuf": 29,
    "trente deux": 32, "trente trois": 33, "trente quatre": 34, "trente cinq": 35, "trente six": 36, "trente sept": 37, "trente huit": 38, "trente neuf": 39,
    "quarante deux": 42, "quarante trois": 43, "quarante quatre": 44, "quarante cinq": 45, "quarante six": 46, "quarante sept": 47, "quarante huit": 48, "quarante neuf": 49,
    "cinquante deux": 52, "cinquante trois": 53, "cinquante quatre": 54, "cinquante cinq": 55, "cinquante six": 56, "cinquante sept": 57, "cinquante huit": 58, "cinquante neuf": 59,
    "soixante deux": 62, "soixante trois": 63, "soixante quatre": 64, "soixante cinq": 65, "soixante six": 66, "soixante sept": 67, "soixante huit": 68, "soixante neuf": 69,
    // Numeric strings
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i]))
  },
  de: { // Deutsch
    "null": 0, "eins": 1, "zwei": 2, "drei": 3, "vier": 4, "fünf": 5, "sechs": 6, "sieben": 7, "acht": 8, "neun": 9, "zehn": 10,
    "elf": 11, "zwölf": 12, "dreizehn": 13, "vierzehn": 14, "fünfzehn": 15, "sechzehn": 16, "siebzehn": 17, "achtzehn": 18, "neunzehn": 19, "zwanzig": 20,
    "einundzwanzig": 21, "zweiundzwanzig": 22, "dreiundzwanzig": 23, "vierundzwanzig": 24, "fünfundzwanzig": 25, "sechsundzwanzig": 26, "siebenundzwanzig": 27, "achtundzwanzig": 28, "neunundzwanzig": 29,
    "dreißig": 30, "einunddreißig": 31, "zweiunddreißig": 32, "dreiunddreißig": 33, "vierunddreißig": 34, "fünfunddreißig": 35, "sechsunddreißig": 36, "siebenunddreißig": 37, "achtunddreißig": 38, "neununddreißig": 39,
    "vierzig": 40, "einundvierzig": 41, "zweiundvierzig": 42, "dreiundvierzig": 43, "vierundvierzig": 44, "fünfundvierzig": 45, "sechsundvierzig": 46, "siebenundvierzig": 47, "achtundvierzig": 48, "neunundvierzig": 49,
    "fünfzig": 50,
    "einundfünfzig": 51, "zweiundfünfzig": 52, "dreiundfünfzig": 53, "vierundfünfzig": 54, "fünfundfünfzig": 55, "sechsundfünfzig": 56, "siebenundfünfzig": 57, "achtundfünfzig": 58, "neunundfünfzig": 59,
    "sechzig": 60, "einundsechzig": 61, "zweiundsechzig": 62, "dreiundsechzig": 63, "vierundsechzig": 64, "fünfundsechzig": 65, "sechsundsechzig": 66, "siebenundsechzig": 67, "achtundsechzig": 68, "neunundsechzig": 69,
    "siebzig": 70, "einundsiebzig": 71, "zweiundsiebzig": 72, "dreiundsiebzig": 73, "vierundsiebzig": 74, "fünfundsiebzig": 75, "sechsundsiebzig": 76, "siebenundsiebzig": 77, "achtundsiebzig": 78, "neunundsiebzig": 79,
    "achtzig": 80, "einundachtzig": 81, "zweiundachtzig": 82, "dreiundachtzig": 83, "vierundachtzig": 84, "fünfundachtzig": 85, "sechsundachtzig": 86, "siebenundachtzig": 87, "achtundachtzig": 88, "neunundachtzig": 89,
    "neunzig": 90, "einundneunzig": 91, "zweiundneunzig": 92, "dreiundneunzig": 93, "vierundneunzig": 94, "fünfundneunzig": 95, "sechsundneunzig": 96, "siebenundneunzig": 97, "achtundneunzig": 98, "neunundneunzig": 99,
    "hundert": 100, "einhundert": 100,
    "hunderteins": 101, "einhunderteins": 101, "hundertzwei": 102, "einhundertzwei": 102, "hundertdrei": 103, "einhundertdrei": 103, "hundertvier": 104, "einhundertvier": 104, "hundertfünf": 105, "einhundertfünf": 105,
    "hundertsechs": 106, "einhundertsechs": 106, "hundertsieben": 107, "einhundertsieben": 107, "hundertacht": 108, "einhundertacht": 108, "hundertneun": 109, "einhundertneun": 109, "hundertzehn": 110, "einhundertzehn": 110,
    "hundertelf": 111, "einhundertelf": 111, "hundertzwölf": 112, "einhundertzwölf": 112, "hundertdreizehn": 113, "einhundertdreizehn": 113, "hundertvierzehn": 114, "einhundertvierzehn": 114, "hundertfünfzehn": 115, "einhundertfünfzehn": 115,
    "hundertsechzehn": 116, "einhundertsechzehn": 116, "hundertsiebzehn": 117, "einhundertsiebzehn": 117, "hundertachtzehn": 118, "einhundertachtzehn": 118, "hundertneunzehn": 119, "einhundertneunzehn": 119, "hundertzwanzig": 120, "einhundertzwanzig": 120,
    "hunderteinundzwanzig": 121, "einhunderteinundzwanzig": 121, // ... (continuare fino a 199 se necessario per parole specifiche)
    // Esempio per gli estremi, gli altri seguono lo schema
    "hundertneunundneunzig": 199, "einhundertneunundneunzig": 199,
    "zweihundert": 200,
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i])),
  },
  ar: { // Arabo
    "صفر": 0, "واحد": 1, "واحِد": 1, "اثنان": 2, "إثنان": 2, "اثنين": 2, "ثلاثة": 3, "أربعة": 4, "خمسة": 5, "ستة": 6, "سبعة": 7, "ثمانية": 8, "تسعة": 9, "عشرة": 10,
    "أحد عشر": 11, "اثنا عشر": 12, "اثني عشر": 12, "ثلاثة عشر": 13, "أربعة عشر": 14, "خمسة عشر": 15, "ستة عشر": 16, "سبعة عشر": 17, "ثمانية عشر": 18, "تسعة عشر": 19, "عشرون": 20,
    "واحد وعشرون": 21, "اثنان وعشرون": 22, "اثنين وعشرون": 22, "ثلاثة وعشرون": 23, "أربعة وعشرون": 24, "خمسة وعشرون": 25, "ستة وعشرون": 26, "سبعة وعشرون": 27, "ثمانية وعشرون": 28, "تسعة وعشرون": 29,
    "ثلاثون": 30, "واحد وثلاثون": 31, "اثنان وثلاثون": 32, "اثنين وثلاثون": 32, "ثلاثة وثلاثون": 33, "أربعة وثلاثون": 34, "خمسة وثلاثون": 35, "ستة وثلاثون": 36, "سبعة وثلاثون": 37, "ثمانية وثلاثون": 38, "تسعة وثلاثون": 39,
    "أربعون": 40, "واحد وأربعون": 41, "اثنان وأربعون": 42, "اثنين وأربعون": 42, "ثلاثة وأربعون": 43, "أربعة وأربعون": 44, "خمسة وأربعون": 45, "ستة وأربعون": 46, "سبعة وأربعون": 47, "ثمانية وأربعون": 48, "تسعة وأربعون": 49,
    "خمسون": 50,
    "واحد وخمسون": 51, "اثنان وخمسون": 52, "اثنين وخمسون": 52, "ثلاثة وخمسون": 53, "أربعة وخمسون": 54, "خمسة وخمسون": 55, "ستة وخمسون": 56, "سبعة وخمسون": 57, "ثمانية وخمسون": 58, "تسعة وخمسون": 59,
    "ستون": 60, "واحد وستون": 61, "اثنان وستون": 62, "اثنين وستون": 62, "ثلاثة وستون": 63, "أربعة وستون": 64, "خمسة وستون": 65, "ستة وستون": 66, "سبعة وستون": 67, "ثمانية وستون": 68, "تسعة وستون": 69,
    "سبعون": 70, "واحد وسبعون": 71, "اثنان وسبعون": 72, "اثنين وسبعون": 72, "ثلاثة وسبعون": 73, "أربعة وسبعون": 74, "خمسة وسبعون": 75, "ستة وسبعون": 76, "سبعة وسبعون": 77, "ثمانية وسبعون": 78, "تسعة وسبعون": 79,
    "ثمانون": 80, "واحد وثمانون": 81, "اثنان وثمانون": 82, "اثنين وثمانون": 82, "ثلاثة وثمانون": 83, "أربعة وثمانون": 84, "خمسة وثمانون": 85, "ستة وثمانون": 86, "سبعة وثمانون": 87, "ثمانية وثمانون": 88, "تسعة وثمانون": 89,
    "تسعون": 90, "واحد وتسعون": 91, "اثنان وتسعون": 92, "اثنين وتسعون": 92, "ثلاثة وتسعون": 93, "أربعة وتسعون": 94, "خمسة وتسعون": 95, "ستة وتسعون": 96, "سبعة وتسعون": 97, "ثمانية وتسعون": 98, "تسعة وتسعون": 99,
    "مائة": 100,
    "مائة وواحد": 101, "مائة واثنان": 102, "مائة واثنين": 102, "مائة وثلاثة": 103, "مائة وأربعة": 104, "مائة وخمسة": 105, "مائة وستة": 106, "مائة وسبعة": 107, "مائة وثمانية": 108, "مائة وتسعة": 109, "مائة وعشرة": 110,
    "مائة وأحد عشر": 111, "مائة واثنا عشر": 112, "مائة واثني عشر": 112, "مائة وثلاثة عشر": 113, "مائة وأربعة عشر": 114, "مائة وخمسة عشر": 115, "مائة وستة عشر": 116, "مائة وسبعة عشر": 117, "مائة وثمانية عشر": 118, "مائة وتسعة عشر": 119, "مائة وعشرون": 120,
    // ... (continuare la logica per numeri come مائة وواحد وعشرون fino a مائة وتسعة وتسعون)
    "مائة وواحد وعشرون": 121,
    "مائة وتسعة وتسعون": 199,
    "مائتان": 200,
    // Cifre standard (0-200)
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i])),
    // Numeri Arabi Orientali (٠-٢٠٠)
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toLocaleString('ar-EG', { useGrouping: false }), i])),
  },
  ja: { // Giapponese
    "ゼロ": 0, "れい": 0, "零": 0,
    "いち": 1, "一": 1,
    "に": 2, "二": 2,
    "さん": 3, "三": 3,
    "よん": 4, "し": 4, "四": 4,
    "ご": 5, "五": 5,
    "ろく": 6, "六": 6,
    "なな": 7, "しち": 7, "七": 7,
    "はち": 8, "八": 8,
    "きゅう": 9, "く": 9, "九": 9,
    "じゅう": 10, "十": 10,
    "じゅういち": 11, "十一": 11,
    "じゅうに": 12, "十二": 12,
    "じゅうさん": 13, "十三": 13,
    "じゅうよん": 14, "じゅうし": 14, "十四": 14,
    "じゅうご": 15, "十五": 15,
    "じゅうろく": 16, "十六": 16,
    "じゅうなな": 17, "じゅうしち": 17, "十七": 17,
    "じゅうはち": 18, "十八": 18,
    "じゅうきゅう": 19, "じゅうく": 19, "十九": 19,
    "にじゅう": 20, "二十": 20,
    "にじゅういち": 21, "二十一": 21,
    "にじゅうに": 22, "二十二": 22,
    "にじゅうさん": 23, "二十三": 23,
    "にじゅうよん": 24, "にじゅうし": 24, "二十四": 24,
    "にじゅうご": 25, "二十五": 25,
    "にじゅうろく": 26, "二十六": 26,
    "にじゅうなな": 27, "にじゅうしち": 27, "二十七": 27,
    "にじゅうはち": 28, "二十八": 28,
    "にじゅうきゅう": 29, "にじゅうく": 29, "二十九": 29,
    "さんじゅう": 30, "三十": 30,
    "さんじゅういち": 31, "三十一": 31,
    "さんじゅうに": 32, "三十二": 32,
    "さんじゅうさん": 33, "三十三": 33,
    "さんじゅうよん": 34, "さんじゅうし": 34, "三十四": 34,
    "さんじゅうご": 35, "三十五": 35,
    "さんじゅうろく": 36, "三十六": 36,
    "さんじゅうなな": 37, "さんじゅうしち": 37, "三十七": 37,
    "さんじゅうはち": 38, "三十八": 38,
    "さんじゅうきゅう": 39, "さんじゅうく": 39, "三十九": 39,
    "よんじゅう": 40, "四十": 40,
    "よんじゅういち": 41, "四十一": 41,
    "よんじゅうに": 42, "四十二": 42,
    "よんじゅうさん": 43, "四十三": 43,
    "よんじゅうよん": 44, "よんじゅうし": 44, "四十四": 44,
    "よんじゅうご": 45, "四十五": 45,
    "よんじゅうろく": 46, "四十六": 46,
    "よんじゅうなな": 47, "よんじゅうしち": 47, "四十七": 47,
    "よんじゅうはち": 48, "四十八": 48,
    "よんじゅうきゅう": 49, "よんじゅうく": 49, "四十九": 49,
    "ごじゅう": 50, "五十": 50,
    "ごじゅういち": 51, "五十一": 51, "ごじゅうに": 52, "五十二": 52, "ごじゅうさん": 53, "五十三": 53, "ごじゅうよん": 54, "ごじゅうし": 54, "五十四": 54, "ごじゅうご": 55, "五十五": 55, "ごじゅうろく": 56, "五十六": 56, "ごじゅうなな": 57, "ごじゅうしち": 57, "五十七": 57, "ごじゅうはち": 58, "五十八": 58, "ごじゅうきゅう": 59, "ごじゅうく": 59, "五十九": 59,
    "ろくじゅう": 60, "六十": 60, "ろくじゅういち": 61, "六十一": 61, "ろくじゅうに": 62, "六十二": 62, "ろくじゅうさん": 63, "六十三": 63, "ろくじゅうよん": 64, "ろくじゅうし": 64, "六十四": 64, "ろくじゅうご": 65, "六十五": 65, "ろくじゅうろく": 66, "六十六": 66, "ろくじゅうなな": 67, "ろくじゅうしち": 67, "六十七": 67, "ろくじゅうはち": 68, "六十八": 68, "ろくじゅうきゅう": 69, "ろくじゅうく": 69, "六十九": 69,
    "ななじゅう": 70, "しちじゅう": 70, "七十": 70, "ななじゅういち": 71, "七十一": 71, "ななじゅうに": 72, "七十二": 72, "ななじゅうさん": 73, "七十三": 73, "ななじゅうよん": 74, "ななじゅうし": 74, "七十四": 74, "ななじゅうご": 75, "七十五": 75, "ななじゅうろく": 76, "七十六": 76, "ななじゅうなな": 77, "ななじゅうしち": 77, "七十七": 77, "ななじゅうはち": 78, "七十八": 78, "ななじゅうきゅう": 79, "ななじゅうく": 79, "七十九": 79,
    "はちじゅう": 80, "八十": 80, "はちじゅういち": 81, "八十一": 81, "はちじゅうに": 82, "八十二": 82, "はちじゅうさん": 83, "八十三": 83, "はちじゅうよん": 84, "はちじゅうし": 84, "八十四": 84, "はちじゅうご": 85, "八十五": 85, "はちじゅうろく": 86, "八十六": 86, "はちじゅうなな": 87, "はちじゅうしち": 87, "八十七": 87, "はちじゅうはち": 88, "八十八": 88, "はちじゅうきゅう": 89, "はちじゅうく": 89, "八十九": 89,
    "きゅうじゅう": 90, "九十": 90, "きゅうじゅういち": 91, "九十一": 91, "きゅうじゅうに": 92, "九十二": 92, "きゅうじゅうさん": 93, "九十三": 93, "きゅうじゅうよん": 94, "きゅうじゅうし": 94, "九十四": 94, "きゅうじゅうご": 95, "九十五": 95, "きゅうじゅうろく": 96, "九十六": 96, "きゅうじゅうなな": 97, "きゅうじゅうしち": 97, "九十七": 97, "きゅうじゅうはち": 98, "九十八": 98, "きゅうじゅうきゅう": 99, "きゅうじゅうく": 99, "九十九": 99,
    "ひゃく": 100, "百": 100,
    "ひゃくいち": 101, "百一": 101, "ひゃくに": 102, "百二": 102, "ひゃくさん": 103, "百三": 103, "ひゃくよん": 104, "ひゃくし": 104, "百四": 104, "ひゃくご": 105, "百五": 105, "ひゃくろく": 106, "百六": 106, "ひゃくなな": 107, "ひゃくしち": 107, "百七": 107, "ひゃくはち": 108, "百八": 108, "ひゃくきゅう": 109, "ひゃくく": 109, "百九": 109, "ひゃくじゅう": 110, "百十": 110,
    "ひゃくじゅういち": 111, "百十一": 111, "ひゃくじゅうに": 112, "百十二": 112, "ひゃくじゅうさん": 113, "百十三": 113, "ひゃくじゅうよん": 114, "ひゃくじゅうし": 114, "百十四": 114, "ひゃくじゅうご": 115, "百十五": 115, "ひゃくじゅうろく": 116, "百十六": 116, "ひゃくじゅうなな": 117, "ひゃくじゅうしち": 117, "百十七": 117, "ひゃくじゅうはち": 118, "百十八": 118, "ひゃくじゅうきゅう": 119, "ひゃくじゅうく": 119, "百十九": 119, "ひゃくにじゅう": 120, "百二十": 120,
    // ... (continuare per le decine delle centinaia)
    "ひゃくさんじゅう": 130, "百三十": 130, "ひゃくよんじゅう": 140, "百四十": 140, "ひゃくごじゅう": 150, "百五十": 150, "ひゃくろくじゅう": 160, "百六十": 160, "ひゃくななじゅう": 170, "百七十": 170, "ひゃくはちじゅう": 180, "百八十": 180, "ひゃくきゅうじゅう": 190, "百九十": 190,
    "ひゃくきゅうじゅうきゅう": 199, "百九十九": 199,
    "にひゃく": 200, "二百": 200,
    ...Object.fromEntries(Array.from({ length: 201 }, (_, i) => [i.toString(), i])),
  }
};