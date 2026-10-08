export const duration=73,starts=[0,2,4,5,59],stationStarts={dumbbells:5,bench:23,elliptical:42};
export const clamp=x=>Math.min(1,Math.max(0,x));
export const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
// Two full controlled reps finish before each two-second recovery. Hold the
// completed pose for 0.4 seconds, grow over 1.3 seconds, then settle for 0.3.
export const growthWindows=[
 {station:'dumbbells',start:16.4,end:17.7,amount:.38},
 {station:'bench',start:34.4,end:35.7,amount:.34},
 {station:'elliptical',start:53.4,end:54.7,amount:.28},
];
const segments=[
 [0,2,'dumbbells','try',0,'Start with Nemotron','It can lift. Now train the technique.'],
 [2,4,'dumbbells','prepare',1,'Prepare training tasks','Different tasks. Different techniques to practice.'],
 [4,5,'dumbbells','environment',2,'Connect NeMo Gym','One place to practice and receive feedback.'],
 [5,8,'dumbbells','try',3,'Dumbbells: first attempt','It lifts the weights. But swings its body.'],
 [8,9,'dumbbells','feedback',3,'Evaluate the attempt','Completion is only part of the picture.'],
 [9,10,'dumbbells','update',3,'NeMo RL updates Nemotron','Feedback becomes a model update.'],
 [10,13,'dumbbells','retry',3,'Dumbbells: practice again','Full movement. A steadier body.'],
 [13,16,'dumbbells','retry',3,'Dumbbells: repeat the technique','Another controlled lift. All the way back down.'],
 [16,18,'dumbbells','recover',3,'Dumbbells: practice completed','The practice is paying off.'],
 [18,19,'dumbbells','putdown',3,'Move to another task','Now practice a different skill.'],
 [19,21,'bench','walk-bench',3,'Move to the bench press','Same learner. A different task.'],
 [21,23,'bench','mount-bench',3,'Bench press','Get ready for the next attempt.'],
 [23,26,'bench','try',3,'Bench press: first attempt','The press finishes. The bar wobbles.'],
 [26,27,'bench','feedback',3,'Evaluate the press','Reward a controlled, steady press.'],
 [27,28,'bench','update',3,'NeMo RL updates Nemotron','Use that feedback to improve the next attempt.'],
 [28,31,'bench','retry',3,'Bench press: practice again','A smoother press. A level bar.'],
 [31,34,'bench','retry',3,'Bench press: repeat the technique','Another smooth press. A controlled return.'],
 [34,36,'bench','recover',3,'Bench press: practice completed','The practice is paying off.'],
 [36,38,'bench','unmount-bench',3,'Practice across tasks','One exercise does not train every capability.'],
 [38,41,'elliptical','walk-elliptical',3,'Move to the elliptical','The next task calls for coordination.'],
 [41,42,'elliptical','mount-elliptical',3,'Elliptical','Prepare for another kind of movement.'],
 [42,45,'elliptical','try',3,'Elliptical: first attempt','The pedals turn. The rhythm is uneven.'],
 [45,46,'elliptical','feedback',3,'Evaluate the movement','Reward coordination and a steady rhythm.'],
 [46,47,'elliptical','update',3,'NeMo RL updates Nemotron','Practice, feedback, update. Repeat across tasks.'],
 [47,50,'elliptical','retry',3,'Elliptical: practice again','Coordinated movement. A steadier rhythm.'],
 [50,53,'elliptical','retry',3,'Elliptical: repeat the technique','Another full cycle. Keep the rhythm steady.'],
 [53,55,'elliptical','recover',3,'Elliptical: practice completed','The practice is paying off.'],
 [55,56,'elliptical','unmount-elliptical',3,'Bring the learning back','Return to the first exercise.'],
 [56,58,'dumbbells','walk-home',3,'Return to the weights','Same robot. Better-practiced technique.'],
 [58,59,'dumbbells','pickup',3,'Try the first task again','Put the practiced technique to work.'],
 [59,63,'dumbbells','final',4,'See the change','Full range. A steady body.'],
 [63,67,'dumbbells','final',4,'See the change','Controlled lift. Controlled return.'],
 [67,71,'dumbbells','final',4,'See the change','The technique holds, rep after rep.'],
 [71,73,'dumbbells','hold',4,'See the change','Same model. Better-practiced behavior.'],
];
export function script(t){
 const row=segments.find(r=>t>=r[0]&&t<r[1])||segments.at(-1);
 const [start,end,station,action,phase,kicker,title]=row;
 const progress=clamp((t-start)/(end-start));
 const trained=['retry','recover','final','hold','putdown','pickup','walk-home','unmount-bench','unmount-elliptical'].includes(action);
 return{time:t,start,end,station,action,phase,progress,quality:action==='update'?smooth(progress):trained?1:0,kicker:`0${phase+1} / ${kicker}`,title};
}
