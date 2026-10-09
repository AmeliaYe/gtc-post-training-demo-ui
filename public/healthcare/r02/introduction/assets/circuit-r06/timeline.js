export const duration=30,starts=[0,3,7,13,18];
export const clamp=x=>Math.min(1,Math.max(0,x));
export const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
const segments=[
 [0,3,'dumbbells','try',0,'Start with a model','It can complete the task. Now improve the technique.'],
 [3,7,'dumbbells','prepare',1,'Prepare practice tasks','Choose the skills and movements it needs to practice.'],
 [7,9,'bench','walk-bench',2,'Practice in an environment','The robot moves to its first practice task.'],
 [9,10,'bench','mount-bench',2,'Practice in an environment','Get into position and begin the attempt.'],
 [10,13,'bench','try',2,'Practice in an environment','It completes the press, but the bar wobbles.'],
 [13,16,'bench','feedback',3,'Learn from feedback','The coaches identify what needs to improve.'],
 [16,18,'bench','update',3,'Learn from feedback','The feedback becomes a model update.'],
 [18,23,'bench','retry',4,'See the improvement','A smoother press. A level bar.'],
 [23,26.5,'bench','final',4,'See the improvement','The stronger technique holds on another rep.'],
 [26.5,27.5,'bench','unmount-bench',4,'See the improvement','The stronger robot finishes the set.'],
 [27.5,29,'bench','walk-center',4,'See the improvement','Step back and show the change.'],
 [29,30,'bench','showcase',4,'See the improvement','Stronger through practice and feedback.']
];
export function script(t){
 const row=segments.find(r=>t>=r[0]&&t<r[1])||segments.at(-1);
 const [start,end,station,action,phase,kicker,title]=row;
 const progress=clamp((t-start)/(end-start));
 const trained=['retry','final','hold','putdown','pickup','walk-home','walk-center','showcase','unmount-bench','unmount-elliptical'].includes(action);
 return{time:t,start,end,station,action,phase,progress,quality:action==='update'?smooth(progress):trained?1:0,kicker:`0${phase+1} / ${kicker}`,title};
}
