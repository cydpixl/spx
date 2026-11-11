export function sportsDay(now=Date.now()) {
 const date=new Date(now);
 if (date.getHours()<1) date.setDate(date.getDate()-1);
 return [date.getFullYear(),date.getMonth()+1,date.getDate()].map(n=>String(n).padStart(2,'0')).join('');
}

export function profileAllows(profile,event) {
 if (!profile?.completed) return true;
 if (!profile.sports?.includes(event.category)) return false;
 if (event.category!=='basketball' || !Array.isArray(profile.leagues)) return true;
 const aliases={'nba':'basketball/nba','wnba':'basketball/wnba','ncaa':'basketball/mens-college-basketball','ncaa basketball':'basketball/mens-college-basketball'};
 const title=String(event.title||'');
 const label=Object.keys(aliases).find(name=>new RegExp('^'+name+'\\b','i').test(title));
 const league=event.leaguePath||aliases[String(event.league||'').toLowerCase()]||aliases[label];
 return profile.leagues.includes(league);
}
