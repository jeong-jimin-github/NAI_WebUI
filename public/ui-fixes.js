(() => {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const V45 = () => ($('#modelSelect')?.value || '').startsWith('nai-diffusion-4-5');
  const token = () => sessionStorage.getItem('naiToken') || localStorage.getItem('naiToken') || '';

  const KO_TAGS = [
    ['1girl','여자 한 명','소녀 한 명 여성 한 명'],['2girls','여자 두 명','소녀 두 명'],['1boy','남자 한 명','소년 한 명 남성 한 명'],['solo','단독 인물','혼자 솔로'],
    ['looking at viewer','정면 응시','카메라 응시 시선 고정'],['smile','미소','웃음 밝은 표정'],['blush','홍조','부끄러움 볼 붉힘'],['open mouth','입 벌림','입 열기'],['closed mouth','입 다묾',''],
    ['long hair','긴 머리','장발'],['short hair','짧은 머리','단발 숏컷'],['medium hair','중간 길이 머리',''],['very long hair','매우 긴 머리',''],['twintails','트윈테일','양갈래'],['ponytail','포니테일','묶은 머리'],['braid','땋은 머리','브레이드'],['hair bun','올림머리','번 헤어'],
    ['black hair','검은 머리','흑발'],['brown hair','갈색 머리',''],['blonde hair','금발','노란 머리'],['pink hair','분홍 머리','핑크 머리'],['blue hair','파란 머리',''],['white hair','흰 머리','백발'],['silver hair','은발','회은색 머리'],['red hair','빨간 머리','붉은 머리'],['purple hair','보라 머리',''],
    ['red eyes','붉은 눈','빨간 눈'],['blue eyes','푸른 눈','파란 눈'],['green eyes','초록 눈',''],['yellow eyes','노란 눈',''],['purple eyes','보라 눈',''],['heterochromia','오드아이','이색 눈'],
    ['school uniform','교복','학생복'],['serafuku','세라복','세일러복'],['shirt','셔츠',''],['white shirt','흰 셔츠',''],['skirt','치마',''],['pleated skirt','주름 치마','플리츠 스커트'],['dress','드레스','원피스'],['jacket','재킷','자켓'],['hoodie','후드티','후디'],['kimono','기모노',''],['maid','메이드',''],['swimsuit','수영복',''],['bikini','비키니',''],['thighhighs','허벅지 스타킹','니삭스 오버니삭스'],['pantyhose','스타킹','팬티스타킹'],['gloves','장갑',''],['hat','모자',''],['hair ornament','머리 장식','헤어 액세서리'],
    ['sitting','앉아 있음','착석'],['standing','서 있음',''],['lying','누워 있음',''],['walking','걷기',''],['kneeling','무릎 꿇기',''],['full body','전신',''],['upper body','상반신','허리 위'],['cowboy shot','허벅지 위 샷','코보이 샷'],['close-up','클로즈업','근접 샷'],['from side','측면 구도','옆모습'],['from behind','후면 구도','뒷모습'],['from above','위에서 본 구도','하이앵글'],['from below','아래에서 본 구도','로우앵글'],['dutch angle','기울어진 구도','더치 앵글'],
    ['outdoors','실외','야외 바깥'],['indoors','실내',''],['classroom','교실',''],['bedroom','침실',''],['street','거리','길거리'],['city','도시',''],['night','밤','야간'],['day','낮','주간'],['sunset','노을','석양'],['sky','하늘',''],['blue sky','푸른 하늘',''],['cherry blossoms','벚꽃',''],['rain','비',''],['snow','눈',''],['beach','해변','바닷가'],['ocean','바다',''],['forest','숲',''],
    ['holding','손에 듦','들고 있음'],['book','책',''],['phone','휴대폰','스마트폰 핸드폰'],['weapon','무기',''],['sword','검','칼'],['gun','총',''],['staff','지팡이',''],['magic','마법',''],['fantasy','판타지',''],['science fiction','SF','공상과학'],
    ['simple background','단순 배경','심플 배경'],['white background','흰 배경','하얀 배경'],['black background','검은 배경',''],['transparent background','투명 배경','배경 투명'],['gradient background','그라데이션 배경',''],['no humans','사람 없음','인물 없음'],
    ['depth of field','심도 표현','아웃포커싱'],['blurry background','흐린 배경','배경 블러'],['dramatic lighting','극적인 조명','드라마틱 라이팅'],['backlighting','역광','백라이트'],['volumetric lighting','볼류메트릭 조명','빛줄기'],['rim light','림라이트','윤곽광'],
    ['masterpiece','고품질','명작풍'],['very aesthetic','미려한 화풍','심미적'],['best quality','최상 품질','최고 품질'],['highres','고해상도',''],['absurdres','초고해상도',''],['no text','텍스트 없음','문자 없음'],['rating:general','안전 등급','세이프'],
    ['animal ears','동물 귀','수인 귀'],['cat ears','고양이 귀','네코미미'],['fox ears','여우 귀',''],['wings','날개',''],['horns','뿔',''],['halo','후광','헤일로'],['tail','꼬리',''],
    ['happy','행복한 표정','기쁨'],['sad','슬픈 표정','슬픔'],['angry','화난 표정','분노'],['embarrassed','당황한 표정','부끄러운 표정'],['expressionless','무표정',''],['one eye closed','한쪽 눈 감기','윙크'],['closed eyes','눈 감음',''],
    ['flower','꽃',''],['rose','장미',''],['food','음식',''],['chair','의자',''],['bed','침대',''],['window','창문',''],['umbrella','우산',''],['headphones','헤드폰','헤드셋']
  ].map(([tag, ko, aliases]) => ({ tag, ko, aliases: aliases ? aliases.split(' ') : [] }));

  const COMMUNITY_URL = 'https://raw.githubusercontent.com/DCP-arca/NAI-Auto-Generator/main/assets/danbooru_tags_post_count.csv';
  let community = null;
  let communityPromise = null;
  let shown = [];
  let activeIndex = -1;
  let requestSeq = 0;

  function lastQuery(value) { return String(value || '').split(',').pop().trim(); }

  function koMatches(q) {
    q = q.toLowerCase();
    if (!q) return [];
    const a = [], b = [];
    for (const item of KO_TAGS) {
      const values = [item.tag, item.ko, ...item.aliases].map(v => v.toLowerCase());
      if (values.some(v => v.startsWith(q))) a.push(item);
      else if (values.some(v => v.includes(q))) b.push(item);
    }
    return [...a, ...b].slice(0, 18).map(x => ({ tag:x.tag, label:x.ko, source:'한국어 목록', score:'' }));
  }

  async function loadCommunity() {
    if (community) return community;
    if (communityPromise) return communityPromise;
    communityPromise = fetch(COMMUNITY_URL, { cache:'force-cache' }).then(r => r.ok ? r.text() : '').then(text => {
      community = text.split(/\r?\n/).map(line => {
        const m = line.match(/^(.+?)\[(\d+)\]$/);
        return m ? { tag:m[1].replaceAll('_',' '), score:Number(m[2]) } : null;
      }).filter(Boolean);
      return community;
    }).catch(() => (community=[]));
    return communityPromise;
  }

  function communityMatches(q, list) {
    q = q.toLowerCase().replaceAll('_',' ');
    if (!q || !Array.isArray(list)) return [];
    const first=[], rest=[];
    for (const item of list) {
      const tag=item.tag.toLowerCase();
      if (tag.startsWith(q)) first.push(item);
      else if (q.length>=3 && tag.includes(q)) rest.push(item);
      if (first.length>=22 && rest.length>=8) break;
    }
    return [...first,...rest].slice(0,20).map(x=>({tag:x.tag,label:x.tag,source:'아카라이브 NAI 목록',score:x.score}));
  }

  async function officialMatches(q) {
    const t=token();
    if (!t || !V45()) return [];
    try {
      const model=$('#modelSelect').value;
      const params=new URLSearchParams({model,prompt:q,lang:'en'});
      const r=await fetch(`/api/nai/tags?${params}`,{headers:{'X-NAI-Token':t}});
      if(!r.ok) return [];
      const data=await r.json();
      return (Array.isArray(data?.tags)?data.tags:[]).slice(0,20).map(item=>{
        const tag=typeof item==='string'?item:(item.tag||item.value||item.name||'');
        const known=KO_TAGS.find(x=>x.tag.toLowerCase()===String(tag).toLowerCase());
        return {tag,label:known?.ko||tag,source:'NovelAI 공식',score:typeof item==='object'?(item.count??item.confidence??item.post_count??''):''};
      }).filter(x=>x.tag);
    } catch { return []; }
  }

  function merge(...groups){const out=[],seen=new Set();for(const group of groups)for(const x of group||[]){const k=String(x.tag||'').toLowerCase();if(k&&!seen.has(k)){seen.add(k);out.push(x)}}return out.slice(0,20)}
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

  function hide(){const root=$('#tagSuggestions');if(root){root.classList.add('hidden');root.innerHTML=''}shown=[];activeIndex=-1}
  function render(items, field){const root=$('#tagSuggestions');if(!root||!field||!items.length)return hide();shown=items;activeIndex=-1;const anchor=field.closest('.prompt-field');if(anchor&&root.parentElement!==anchor)anchor.append(root);root.innerHTML='';items.forEach((x,i)=>{const b=document.createElement('button');b.type='button';b.dataset.index=i;b.innerHTML=`<div><strong>${esc(x.label||x.tag)}</strong><small>${esc(x.tag)}</small></div><span class="suggest-meta">${esc(x.source)}${x.score!==''?` · ${Number(x.score).toLocaleString()}`:''}</span>`;b.addEventListener('mousedown',e=>{e.preventDefault();apply(i,field)});root.append(b)});root.classList.remove('hidden')}
  function apply(i,field){const x=shown[i];if(!x)return;const parts=field.value.split(',');parts[parts.length-1]=`${parts.length>1?' ':''}${x.tag}`;field.value=parts.join(',')+', ';field.focus();hide();updateLength()}
  function updateLength(){const v=['promptPrefixInput','promptInput','promptSuffixInput'].map(id=>$('#'+id)?.value.trim()).filter(Boolean).join(', ');if($('#promptLength'))$('#promptLength').textContent=v.length}

  async function complete(field){if(!V45())return hide();const q=lastQuery(field.value);if(!q)return hide();const seq=++requestSeq;const ko=koMatches(q);render(ko,field);const list=await loadCommunity();if(seq!==requestSeq||lastQuery(field.value)!==q)return;const communityResult=communityMatches(q,list);const base=merge(ko,communityResult);render(base,field);const official=await officialMatches(q);if(seq!==requestSeq||lastQuery(field.value)!==q)return;render(merge(official,base),field)}

  function activateLegacy(name){$$('.legacy-tabs .tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name))}
  function modelUi(){const v45=V45();$('#section-reference')?.classList.toggle('hidden',!v45);$('#promptAutocompleteBadge')?.classList.toggle('hidden',!v45);$('#autocompleteHelp')?.classList.toggle('hidden',!v45);$('#autocompleteDisabledHelp')?.classList.toggle('hidden',v45);$('#varietyToggleRow')?.classList.toggle('hidden',!v45);if(!v45)hide()}

  function init(){
    const positive=$('#positivePromptPane'), negative=$('#negativePromptPane');
    $$('[data-prompt-tab]').forEach(b=>b.addEventListener('click',()=>{const pos=b.dataset.promptTab==='positive';$$('[data-prompt-tab]').forEach(x=>x.classList.toggle('active',x===b));positive?.classList.toggle('active',pos);negative?.classList.toggle('active',!pos);if(!pos)hide()}));

    ['promptPrefixInput','promptInput','promptSuffixInput'].forEach(id=>{const field=$('#'+id);if(!field)return;field.addEventListener('input',e=>{e.stopImmediatePropagation();updateLength();clearTimeout(field.__naiTimer);field.__naiTimer=setTimeout(()=>complete(field),70)},true);field.addEventListener('focus',()=>{if(lastQuery(field.value))complete(field)});field.addEventListener('keydown',e=>{if($('#tagSuggestions')?.classList.contains('hidden')||!shown.length)return;if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();e.stopImmediatePropagation();activeIndex=(activeIndex+(e.key==='ArrowDown'?1:-1)+shown.length)%shown.length;$$('#tagSuggestions button').forEach((x,i)=>x.classList.toggle('active',i===activeIndex));$$('#tagSuggestions button')[activeIndex]?.scrollIntoView({block:'nearest'})}else if((e.key==='Enter'||e.key==='Tab')&&activeIndex>=0){e.preventDefault();e.stopImmediatePropagation();apply(activeIndex,field)}else if(e.key==='Escape'){e.preventDefault();hide()}},true)});

    $('#modelSelect')?.addEventListener('change',()=>setTimeout(modelUi,0));
    $('#baseImageInput')?.addEventListener('change',()=>activateLegacy($('#baseImageInput').files?.length?'image':'prompt'),true);
    $('#clearBaseImage')?.addEventListener('click',()=>{const input=$('#baseImageInput');if(!input)return;input.value='';input.dispatchEvent(new Event('change',{bubbles:true}));$('#basePreview').innerHTML='';activateLegacy('prompt')});
    $('#generateButton')?.addEventListener('click',()=>activateLegacy($('#baseImageInput')?.files?.length?'image':'prompt'),true);
    document.addEventListener('mousedown',e=>{if(!e.target.closest('.prompt-field')&&!e.target.closest('#tagSuggestions'))hide()});
    updateLength();modelUi();
  }

  if(document.readyState==='complete')init();else window.addEventListener('load',init,{once:true});
})();
