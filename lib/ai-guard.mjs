// The model selects complete, evidence-bound interpretations; it cannot supply display facts.
export function validateAnswer(answer,catalog){
 if(!answer||typeof answer!=='object'||Array.isArray(answer)||Object.keys(answer).some(k=>!['scope','focusIds','summaryIds','counterpointId','questionIds'].includes(k)))throw Error('AI_OUTPUT_SCHEMA');
 if(!['covered','limited','outside'].includes(answer.scope))throw Error('AI_OUTPUT_SCHEMA');
 const allowed=new Map(catalog.map(c=>[c.id,c]));
 for(const [key,min,max] of [['focusIds',2,4],['summaryIds',1,2],['questionIds',1,3]]){
  const ids=answer[key];if(!Array.isArray(ids)||ids.length<min||ids.length>max||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!allowed.has(id)))throw Error('AI_INVALID_EVIDENCE');
 }
 if(answer.summaryIds.some(id=>!answer.focusIds.includes(id)))throw Error('AI_SUMMARY_CITATION');
 if(!['negative','conflict','unknown'].includes(allowed.get(answer.counterpointId)?.direction))throw Error('AI_MISSING_COUNTERPOINT');
 return answer;
}
// A mandatory safety supplement is deterministic and explicitly disclosed, not attributed to the model.
export function completeCounterpoint(answer,catalog){
 if(!answer||typeof answer!=='object')return {answer,supplemented:false};
 const isCounter=id=>catalog.some(c=>c.id===id&&['negative','conflict','unknown'].includes(c.direction));
 if(isCounter(answer.counterpointId))return {answer,supplemented:false};
 const id=(Array.isArray(answer.focusIds)?answer.focusIds:[]).find(isCounter)||catalog.find(c=>c.direction==='unknown')?.id;
 return {answer:{...answer,counterpointId:id},supplemented:true};
}
