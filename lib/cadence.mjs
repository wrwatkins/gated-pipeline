import { execFileSync } from 'node:child_process'
export function mergedCount(dest) {
  const gh=args=>execFileSync('gh',args,{cwd:dest,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim()
  const repo=JSON.parse(gh(['repo','view','--json','name,owner']))
  const query='query($owner:String!,$name:String!){repository(owner:$owner,name:$name){pullRequests(states:MERGED){totalCount}}}'
  const count=gh(['api','graphql','-f',`query=${query}`,'-F',`owner=${repo.owner.login}`,'-F',`name=${repo.name}`,'--jq','.data.repository.pullRequests.totalCount'])
  if(!/^\d+$/.test(count)) throw new Error('GitHub did not return an exact merged-PR count')
  return Number(count)
}
export function parseEvents(text) {
  const ids=new Set(),merges=new Set()
  return text.split(/\r?\n/).filter(line=>line.trim()).map((line,index)=>{
    let event
    try{event=JSON.parse(line)}catch{throw new Error(`Invalid event JSON at line ${index+1}`)}
    if(!event||typeof event.id!=='string'||!event.id.trim()||ids.has(event.id)||!['merge','escape_found','cadence_completed'].includes(event.type)) throw new Error(`Invalid/duplicate event at line ${index+1}`)
    ids.add(event.id)
    if(event.type==='merge') {
      if(!Number.isInteger(event.pr)||event.pr<1||merges.has(event.pr)||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(event.headSha||'')) throw new Error(`Invalid/duplicate merge at line ${index+1}`)
      merges.add(event.pr)
    }
    if(event.type==='cadence_completed'&&(!Number.isInteger(event.boundary)||event.boundary<1||typeof event.role!=='string'||typeof event.report!=='string'||!event.report.trim())) throw new Error(`Invalid cadence event at line ${index+1}`)
    if(event.type==='escape_found'&&(!Number.isInteger(event.originPr)||event.originPr<1||typeof event.what!=='string'||!event.what.trim())) throw new Error(`Invalid escape event at line ${index+1}`)
    return event
  })
}
export function cadenceDue(registry,project,count,events=[]) {
  if(!Number.isSafeInteger(count)||count<0) throw new Error('Merged count must be a nonnegative integer')
  if(!Number.isSafeInteger(project.cadenceBaseline)||project.cadenceBaseline<0) throw new Error('Invalid adoption baseline')
  if(count<project.cadenceBaseline) throw new Error('Merged count is below the configured adoption baseline')
  const due=[]
  for(const item of registry.cadence) {
    if(!Number.isSafeInteger(item.interval)||item.interval<1||typeof item.role!=='string') throw new Error('Invalid cadence role/interval')
    if(item.capability&&!project.capabilities[item.capability]) continue
    const done=new Set(events.filter(event=>event.type==='cadence_completed'&&event.role===item.role).map(event=>event.boundary))
    for(let boundary=(Math.floor(project.cadenceBaseline/item.interval)+1)*item.interval;boundary<=count;boundary+=item.interval) if(!done.has(boundary)) due.push({role:item.role,boundary})
  }
  return due.sort((a,b)=>a.boundary-b.boundary||a.role.localeCompare(b.role))
}
