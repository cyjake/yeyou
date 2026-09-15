export type CuratedPassage = {
  id: string;
  language: 'ja' | 'zh';
  mood: '静谧' | '旅情' | '季节' | '童心' | '相思' | '豪情' | '清醒';
  sourceText: string;
  readingKana?: string;
  translationZh: string;
  author: string;
  work: string;
  sourceUrl?: string;
  rights: 'public-domain' | 'quotation' | 'personal';
  translationSource: 'editorial' | 'user';
  suggestedTemplate: 'bunko' | 'cinema' | 'notebook' | 'modern-zh' | 'calligraphy';
};

const bashoSource = 'https://www.aozora.gr.jp/index_pages/person2240.html';
const issaSource = 'https://ja.wikisource.org/wiki/作者:小林一茶';
const busonSource = 'https://www.aozora.gr.jp/index_pages/person1456.html';
const sosekiSource = 'https://www.aozora.gr.jp/index_pages/person148.html';
const dazaiSource = 'https://www.aozora.gr.jp/index_pages/person35.html';
const akutagawaSource = 'https://www.aozora.gr.jp/index_pages/person879.html';
const miyazawaSource = 'https://www.aozora.gr.jp/index_pages/person81.html';

const japanesePassages: CuratedPassage[] = [
  literary('studio-snow-country', '旅情', '国境の長いトンネルを抜けると雪国であった。', 'こっきょうのながいとんねるをぬけるとゆきぐにであった', '穿过县界长长的隧道，便是雪国。', '川端康成', '『雪国』', undefined, 'cinema', 'quotation'),
  literary('soseki-cat-opening', '清醒', '吾輩は猫である。名前はまだ無い。', 'わがはいはねこであるなまえはまだない', '我是猫。名字还没有。', '夏目漱石', '『吾輩は猫である』', sosekiSource, 'bunko'),
  literary('dazai-disqualified-opening', '清醒', '恥の多い生涯を送って来ました。', 'はじのおおいしょうがいをおくってきました', '我度过了充满羞耻的一生。', '太宰治', '『人間失格』', dazaiSource, 'cinema'),
  literary('akutagawa-rashomon-opening', '旅情', 'ある日の暮方の事である。', 'あるひのくれがたのことである', '这是某一天傍晚的事。', '芥川龍之介', '『羅生門』', akutagawaSource, 'bunko'),
  literary('miyazawa-rain', '豪情', '雨ニモマケズ風ニモマケズ', 'あめにもまけずかぜにもまけず', '不输给雨，也不输给风。', '宮沢賢治', '『雨ニモマケズ』', miyazawaSource, 'notebook'),
  passage('basho-old-pond', '静谧', '古池や蛙飛びこむ水の音', 'ふるいけやかわずとびこむみずのおと', '古池寂然，青蛙跃入，水声一响。', '松尾芭蕉', bashoSource, 'bunko'),
  passage('basho-cicada', '静谧', '閑さや岩にしみ入る蝉の声', 'しずけさやいわにしみいるせみのこえ', '万籁俱寂，蝉声仿佛渗入岩石。', '松尾芭蕉', bashoSource, 'cinema'),
  passage('basho-mogami', '旅情', '五月雨をあつめて早し最上川', 'さみだれをあつめてはやしもがみがわ', '汇聚五月梅雨，最上川奔流湍急。', '松尾芭蕉', bashoSource, 'cinema'),
  passage('basho-summer-grass', '旅情', '夏草や兵どもが夢の跡', 'なつくさやつわものどもがゆめのあと', '夏草萋萋，唯余武士旧梦之迹。', '松尾芭蕉', bashoSource, 'cinema'),
  passage('basho-final', '旅情', '旅に病んで夢は枯野をかけ廻る', 'たびにやんでゆめはかれのをかけめぐる', '旅中染病，梦仍在枯野上奔走。', '松尾芭蕉', bashoSource, 'bunko'),
  passage('basho-sado', '旅情', '荒海や佐渡によこたふ天河', 'あらうみやさどによこたうあまのがわ', '荒海之上，银河横卧，遥接佐渡。', '松尾芭蕉', bashoSource, 'cinema'),
  passage('basho-moon', '静谧', '名月や池をめぐりて夜もすがら', 'めいげつやいけをめぐりてよもすがら', '明月当空，绕池而行，直至夜深。', '松尾芭蕉', bashoSource, 'bunko'),
  passage('basho-deep-autumn', '季节', '秋深き隣は何をする人ぞ', 'あきふかきとなりはなにをするひとぞ', '秋意已深，邻人此刻在做什么呢。', '松尾芭蕉', bashoSource, 'notebook'),
  passage('basho-nara', '季节', '菊の香や奈良には古き仏達', 'きくのかやならにはふるきほとけたち', '菊香浮动，奈良静立着古老诸佛。', '松尾芭蕉', bashoSource, 'bunko'),
  passage('basho-first-rain', '季节', '初しぐれ猿も小蓑をほしげ也', 'はつしぐれさるもこみのをほしげなり', '初冬阵雨，猿儿似乎也想披一领小蓑衣。', '松尾芭蕉', bashoSource, 'notebook'),
  passage('issa-sparrow-road', '童心', '雀の子そこのけそこのけ御馬が通る', 'すずめのこそこのけそこのけおうまがとおる', '小麻雀，快让开，马儿要从这里经过。', '小林一茶', issaSource, 'notebook'),
  passage('issa-thin-frog', '童心', 'やせ蛙まけるな一茶これにあり', 'やせがえるまけるないっさこれにあり', '瘦青蛙，别认输，一茶在这里为你助阵。', '小林一茶', issaSource, 'notebook'),
  passage('issa-dew-world', '静谧', '露の世は露の世ながらさりながら', 'つゆのよはつゆのよながらさりながら', '人世本如朝露——虽知如此，却仍旧……', '小林一茶', issaSource, 'bunko'),
  passage('issa-orphan-sparrow', '童心', '我と来て遊べや親のない雀', 'われときてあそべやおやのないすずめ', '没有双亲的小麻雀，来同我一起玩吧。', '小林一茶', issaSource, 'notebook'),
  passage('issa-child-moon', '童心', '名月を取ってくれろと泣く子かな', 'めいげつをとってくれろとなくこかな', '孩子哭着央求：把那轮明月摘给我吧。', '小林一茶', issaSource, 'notebook'),
  passage('buson-spring-sea', '静谧', '春の海ひねもすのたりのたりかな', 'はるのうみひねもすのたりのたりかな', '春日海面，终日舒缓地起伏。', '与謝蕪村', busonSource, 'bunko'),
  passage('buson-rapeseed', '季节', '菜の花や月は東に日は西に', 'なのはなやつきはひがしにひはにしに', '油菜花遍野，月升东方，日落西天。', '与謝蕪村', busonSource, 'cinema'),
  passage('buson-morning-glory', '静谧', '朝顔や一輪深き淵の色', 'あさがおやいちりんふかきふちのいろ', '一朵牵牛花，凝着深潭一般的颜色。', '与謝蕪村', busonSource, 'bunko'),
  passage('buson-wild-rose', '季节', '愁ひつつ岡にのぼれば花いばら', 'うれいつつおかにのぼればはないばら', '怀着愁绪登上山冈，忽见野蔷薇盛开。', '与謝蕪村', busonSource, 'cinema'),
  passage('buson-fuji-leaves', '季节', '不二ひとつうづみ残して若葉かな', 'ふじひとつうずみのこしてわかばかな', '新叶漫山，只留下富士一峰未被掩去。', '与謝蕪村', busonSource, 'bunko')
];

const chinesePassages: CuratedPassage[] = [
  chinese('li-bai-quiet-night', '静谧', '床前明月光，疑是地上霜。', '举头望见明月，乡愁也随之醒来。', '李白', '《靜夜思》', 'https://zh.wikisource.org/wiki/靜夜思', 'calligraphy'),
  chinese('wang-wei-autumn-evening', '静谧', '明月松間照，清泉石上流。', '松林明月与石上清泉，共成山居秋夜。', '王維', '《山居秋暝》', 'https://zh.wikisource.org/wiki/山居秋暝', 'calligraphy'),
  chinese('tao-yuanming-drinking', '清醒', '採菊東籬下，悠然見南山。', '采菊之间偶然抬头，南山自在眼前。', '陶淵明', '《飲酒・其五》', 'https://zh.wikisource.org/wiki/飲酒_(陶淵明)', 'calligraphy'),
  chinese('zhang-ruoxu-river-moon', '静谧', '春江潮水連海平，海上明月共潮生。', '春潮与海相接，一轮明月伴潮而生。', '張若虛', '《春江花月夜》', 'https://zh.wikisource.org/wiki/春江花月夜', 'modern-zh'),
  chinese('du-fu-spring-rain', '季节', '隨風潛入夜，潤物細無聲。', '春雨随风入夜，无声滋润万物。', '杜甫', '《春夜喜雨》', 'https://zh.wikisource.org/wiki/春夜喜雨', 'modern-zh'),
  chinese('cui-hu-peach-blossom', '相思', '人面不知何處去，桃花依舊笑春風。', '故人不知所往，桃花仍在春风里盛开。', '崔護', '《題都城南莊》', 'https://zh.wikisource.org/wiki/題都城南莊', 'modern-zh'),
  chinese('li-shangyin-night-rain', '相思', '何當共剪西窗燭，卻話巴山夜雨時。', '盼望重逢后共剪烛花，再谈此刻巴山夜雨。', '李商隱', '《夜雨寄北》', 'https://zh.wikisource.org/wiki/夜雨寄北', 'modern-zh'),
  chinese('qin-guan-magpie-bridge', '相思', '金風玉露一相逢，便勝卻人間無數。', '秋风白露中的一次相逢，已胜过人间无数寻常相守。', '秦觀', '《鵲橋仙》', 'https://zh.wikisource.org/wiki/鵲橋仙_(纖雲弄巧)', 'modern-zh'),
  chinese('yan-shu-huanxi-sand', '季节', '無可奈何花落去，似曾相識燕歸來。', '花落无可挽回，归燕却似旧日相识。', '晏殊', '《浣溪沙》', 'https://zh.wikisource.org/wiki/浣溪沙_(一曲新詞酒一杯)', 'modern-zh'),
  chinese('li-yu-beauty-yu', '相思', '問君能有幾多愁？恰似一江春水向東流。', '愁绪有多少？仿佛一江春水无尽东流。', '李煜', '《虞美人》', 'https://zh.wikisource.org/wiki/虞美人_(春花秋月何時了)', 'modern-zh'),
  chinese('xin-qiji-lanterns', '相思', '驀然回首，那人卻在，燈火闌珊處。', '忽然回首，所寻之人正在灯火稀疏之处。', '辛棄疾', '《青玉案・元夕》', 'https://zh.wikisource.org/wiki/青玉案_(東風夜放花千樹)', 'modern-zh'),
  chinese('nalan-first-sight', '相思', '人生若只如初見，何事秋風悲畫扇。', '如果人生始终如初见，又何来后来离弃的悲凉。', '納蘭性德', '《木蘭花・擬古決絕詞柬友》', 'https://zh.wikisource.org/wiki/木蘭花令_(人生若只如初見)', 'calligraphy'),
  chinese('qu-yuan-long-road', '豪情', '路漫漫其修遠兮，吾將上下而求索。', '道路漫长遥远，我仍将不断追寻。', '屈原', '《離騷》', 'https://zh.wikisource.org/wiki/離騷', 'calligraphy'),
  chinese('analects-three', '清醒', '三人行，必有我師焉。', '同行众人之中，一定有人值得我学习。', '孔子及弟子', '《論語・述而》', 'https://zh.wikisource.org/wiki/論語/述而第七', 'calligraphy'),
  chinese('zhuangzi-white-colt', '清醒', '人生天地之間，若白駒之過隙，忽然而已。', '人生在天地之间，如白马掠过缝隙，转瞬即逝。', '莊周', '《莊子・知北遊》', 'https://zh.wikisource.org/wiki/莊子/知北遊', 'calligraphy'),
  chinese('fan-zhongyan-yueyang', '豪情', '先天下之憂而憂，後天下之樂而樂。', '在天下人忧虑之前忧虑，在天下人享乐之后享乐。', '范仲淹', '《岳陽樓記》', 'https://zh.wikisource.org/wiki/岳陽樓記', 'calligraphy'),
  chinese('wang-bo-tengwang', '豪情', '落霞與孤鶩齊飛，秋水共長天一色。', '晚霞与孤鸟齐飞，秋水和长天连成一色。', '王勃', '《滕王閣序》', 'https://zh.wikisource.org/wiki/滕王閣序', 'modern-zh'),
  chinese('su-shi-red-cliff', '清醒', '寄蜉蝣於天地，渺滄海之一粟。', '人生寄身天地，如沧海之中微小的一粒粟。', '蘇軾', '《前赤壁賦》', 'https://zh.wikisource.org/wiki/前赤壁賦', 'calligraphy'),
  chinese('wang-xizhi-orchid', '清醒', '仰觀宇宙之大，俯察品類之盛。', '仰望宇宙广大，俯察万物繁盛。', '王羲之', '《蘭亭集序》', 'https://zh.wikisource.org/wiki/蘭亭集序', 'calligraphy'),
  chinese('su-shi-water-song', '清醒', '人有悲歡離合，月有陰晴圓缺，此事古難全。', '人生有聚散悲欢，月也有阴晴圆缺，自古难以周全。', '蘇軾', '《水調歌頭》', 'https://zh.wikisource.org/wiki/水調歌頭_(明月幾時有)', 'modern-zh')
];

export const curatedPassages: CuratedPassage[] = [...japanesePassages, ...chinesePassages];

export function pickRandomPassage(
  passages: CuratedPassage[],
  language: CuratedPassage['language'],
  currentSourceText: string,
  random: () => number = Math.random
): CuratedPassage | undefined {
  const matchingLanguage = passages.filter(item => item.language === language);
  const alternatives = matchingLanguage.filter(item => item.sourceText !== currentSourceText);
  const candidates = alternatives.length ? alternatives : matchingLanguage;
  if (!candidates.length) return undefined;
  return candidates[Math.min(candidates.length - 1, Math.floor(Math.max(0, random()) * candidates.length))];
}

function literary(
  id: string,
  mood: CuratedPassage['mood'],
  sourceText: string,
  readingKana: string,
  translationZh: string,
  author: string,
  work: string,
  sourceUrl: string | undefined,
  suggestedTemplate: CuratedPassage['suggestedTemplate'],
  rights: CuratedPassage['rights'] = 'public-domain'
): CuratedPassage {
  return {
    id, language: 'ja', mood, sourceText, readingKana, translationZh, author, work,
    sourceUrl, rights, translationSource: 'editorial', suggestedTemplate
  };
}

function passage(
  id: string,
  mood: CuratedPassage['mood'],
  sourceText: string,
  readingKana: string,
  translationZh: string,
  author: string,
  sourceUrl: string,
  suggestedTemplate: CuratedPassage['suggestedTemplate']
): CuratedPassage {
  return {
    id, language: 'ja', mood, sourceText, readingKana, translationZh, author,
    work: '俳句', sourceUrl, rights: 'public-domain', translationSource: 'editorial', suggestedTemplate
  };
}

function chinese(
  id: string,
  mood: CuratedPassage['mood'],
  sourceText: string,
  translationZh: string,
  author: string,
  work: string,
  sourceUrl: string,
  suggestedTemplate: 'modern-zh' | 'calligraphy'
): CuratedPassage {
  return {
    id, language: 'zh', mood, sourceText, translationZh, author, work, sourceUrl,
    rights: 'public-domain', translationSource: 'editorial', suggestedTemplate
  };
}
