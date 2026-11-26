// Stream one track at a time; decoding the whole score would cost mobile memory.
export class CafeScore {
 private player?: HTMLAudioElement
 private unlocked=false
 private desired=''
 private active=''
 private serviceTrack=0
 private resumeAt=0
 private playing=false
 private static readonly shiftTracks=['Music1','Music2','Music3','Music4']

 unlock(){
  if(!this.player){
   this.player=new Audio()
   this.player.preload='metadata'
   this.player.volume=.29
   this.player.onended=()=>{
    if(this.active===this.shiftTrack){
     this.serviceTrack=(this.serviceTrack+1)%CafeScore.shiftTracks.length
     this.resumeAt=0
     this.desired=this.shiftTrack
     this.apply()
    }
   }
  }
  this.unlocked=true
  this.apply()
 }

 private get shiftTrack(){return CafeScore.shiftTracks[this.serviceTrack]}
 set(mode:'menu'|'prep'|'service'|'silent'){
  const next=mode==='menu'?'Menu':mode==='prep'?'pre_gameplay':mode==='service'?this.shiftTrack:''
  if(this.desired===next)return
  this.desired=next
  this.apply()
 }
 private apply(){
  const audio=this.player
  if(!this.unlocked||!audio)return
  if(!this.desired){audio.pause();this.playing=false;return}
  if(this.active!==this.desired){
   if(this.active===this.shiftTrack)this.resumeAt=audio.currentTime
   this.active=this.desired
   this.playing=false
   audio.src='/audio/score/'+this.active+'.m4a'
   audio.loop=this.active!==this.shiftTrack
   if(this.active===this.shiftTrack&&this.resumeAt>0)audio.currentTime=this.resumeAt
  }
  if(this.playing)return
  this.playing=true
  const track=this.active
  void audio.play().catch(()=>{if(this.active===track)this.playing=false})
 }
}
