const mineflayer = require("mineflayer");
const pvp = require("mineflayer-pvp").plugin;
const {pathfinder, Movements,goals} = require("mineflayer-pathfinder")
const armorManager = require("mineflayer-armor-manager")
const GoalFollow = goals.GoalFollow;

const bot = mineflayer.createBot({ //creation of the bot
    host: "localhost", //localhost
    port: 2322, //here the port of your server
    username: "Maria", // the name of the bot
    
})

bot.loadPlugin(pvp)
bot.loadPlugin(pathfinder)
bot.loadPlugin(armorManager)


bot.on('entitySpawn', async () => {
  const autoeat = await import('mineflayer-auto-eat');

  bot.loadPlugin(autoeat.plugin);
 

  bot.once('entityEat', () => {
    bot.autoEat.options.priority = "auto";
    bot.autoEat.options.startAt = 18; //start eating when the food points are 18 or less 
    
  });

})

bot.once('health',()=>{
  if(bot.food === 0){
    bot.chat("Estoy muriendome de hambre")
  }


})

const noAttack = [
  'Iron Golem','Snow Golem',"Allay"
]


bot.on('playerCollect', (collector, itemDrop)=>{ //itemDrop declared but its never read.
    if (collector !== bot.entity) return

    setTimeout(()=> {

        const sword = bot.inventory.items().find(item => item.name.includes("sword") || item.name.includes("axe") )
        if (sword) bot.equip(sword,"hand")


    }, 150)
})

bot.on('playerCollect', (collector,itemDrop)=>{
    if (collector !== bot.entity) return

    setTimeout(()=> {

        const shield = bot.inventory.items().find(item => item.name.includes("shield"))
        if (shield) bot.equip(shield,"off-hand")

        if (!shield){}

        if(bot.food === 5){
          bot.autoEat.options.startAt = 5
        }
      
    }, 300)

})


 
let guardPos = null
let movingToGuardPos = false

// Assign the given location to be guarded
function guardArea (pos) {
  guardPos = pos

  // We are not currently in combat, move to the guard pos
  if (!bot.pvp.target) {
   
    moveToGuardPos()
  }
}

// Cancel all pathfinder and combat
async function stopGuarding() {
  movingToGuardPos = false
  guardPos = null
  await bot.pvp.stop()
}

// Pathfinder to the guard position
async function moveToGuardPos () {
  // Do nothing if we are already moving to the guard position
  if (movingToGuardPos) return
  // console.info('Moving to guard pos')
  const mcData = require('minecraft-data')(bot.version)
  bot.pathfinder.setMovements(new Movements(bot, mcData))
  try {
    movingToGuardPos = true
    // Wait for pathfinder to go to the guarding position
    await bot.pathfinder.goto(new goals.GoalNear(guardPos.x, guardPos.y, guardPos.z, 2))
    movingToGuardPos = false
  } catch (err) {
    // Catch errors when pathfinder is interrupted by the pvp plugin or if pathfinder cannot find a path
    movingToGuardPos = false
    // console.warn(err)
    // console.warn('Mineflayer-pvp encountered a pathfinder error')
  }
}

// Called when the bot has killed it's target.
bot.once('stoppedAttacking', () => {
  if (guardPos) {
    moveToGuardPos()
  }
  const entidad = bot.nearestEntity()
  if(entidad) bot.lookAt(entidad.position.offset(0,entidad.height,0))
})

// Check for new enemies to attack
bot.on('physicsTick', async () => {
  if (!guardPos) return // Do nothing if bot is not guarding anything

  let entity = null
  // Do not attack mobs if the bot is to far from the guard pos
  if (bot.entity.position.distanceTo(guardPos) < 16) {
      // Only look for mobs within 16 blocks
      const filter = e => (e.type === 'hostile' || e.type === 'mob' && !noAttack.includes(e.displayName)) && e.position.distanceTo(bot.entity.position) < 10 && e.displayName !== 'Armor Stand' // Mojang classifies armor stands as mobs for some reason?
      entity = bot.nearestEntity(filter)
  }
  
  if (entity != null && !movingToGuardPos) {
    // If we have an enemy and we are not moving back to the guarding position: Start attacking
    bot.pvp.attack(entity)
  } else {
    // If we do not have an enemy or if we are moving back to the guarding position do this:
    // If we are close enough to the guarding position do nothing
    if (bot.entity.position.distanceTo(guardPos) < 2) return
    // If we are too far stop pvp and move back to the guarding position
    await bot.pvp.stop()
    moveToGuardPos()
  }

  

})


function hit_enemies() {
    const filter = e => (e.type === 'hostile' || (e.type === 'mob' && !noAttack.includes(e.displayName))) && e.position.distanceTo(bot.entity.position) < 10 && e.displayName !== 'Armor Stand';
    const entity = bot.nearestEntity(filter);

    const sword = bot.inventory.items().find(item => item.name.includes("sword"));

    if (entity) {
        bot.pvp.attack(entity);
        if (sword) {
            bot.equip(sword, 'hand').catch(err => {
                console.error('Failed to equip sword:', err);
            });
        } else {
            console.error('No sword found in inventory');
        }
    }
}


bot.on('physicsTick', hit_enemies);



  function followplayer(usuario) {
    const playerCI = bot.players[usuario];

    if (!playerCI || !playerCI.entity) {
        bot.chat("I can't see you");
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData); 

    bot.pathfinder.setMovements(movements);

    const goal = new GoalFollow(playerCI.entity, 2);
    bot.pathfinder.setGoal(goal, true);
  
}


bot.on('chat', (username, message)=>{
var player = bot.players[username]

    if(message === "guard"){ //if you want the bot guard the position that you where
   

    if (!player){
        bot.chat("I can't see you")
        return
    }



    bot.chat("I will guard the location")
    guardArea(player.entity.position.clone())


    }


    if (message === "fight me"){ //if you want to fight the bot
      

        if (!player){
            bot.chat("I can't see you")
            return
        }



        bot.chat("Preare to fight")
        bot.pvp.attack(player.entity)

    }

    if (message === "stop guard"){
        bot.chat("I will no loger guard this area")
        stopGuarding()

    }

    if (message === "follow me"){
        
      if (!player){
        bot.chat("I can't see you")
        return
    }
      
        bot.chat("I'm coming!")
         followplayer(player.displayName)
         bot.removeListener('physicsTick', hit_enemies); // Disable the event physicsTick

    }else if(message === "stop follow me"){
      bot.pathfinder.setGoal(null); // Stop tracking
      bot.on('physicsTick', hit_enemies);
      bot.chat("ok")
    }

})


bot.on("entitySpawn",()=>{
  const mirar = bot.nearestEntity()
  if(mirar){
    bot.lookAt(mirar.position.offset(0, mirar.height, 0));
  }

})

bot.setMaxListeners(30);