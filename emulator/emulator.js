function EMULATOR(){
    this.controller = new JOYPAD();
    this.mmu = new MMU(this.controller);
    this.cpu = new CPU(this.mmu);
    this.gpu = new GPU(this.mmu);
    this.timer = new TIMER(this.mmu);
    this.serial = new SERIAL(this.mmu);
    
    this.gameOn = false;
}
EMULATOR.prototype.gameLoop = function(draw){
    /*
    optimize by including webGL for drawing code isntead of HTML canvas
    optimize by using parallel processing for hardware components
    with parallel.js api or web workers
    */
    if(this.gameOn)
    {
        i++;
        var cyclesElapsed = 0;
        var cyclesInstructionTook = 0;
        while(cyclesElapsed<70224)
        {
            if(this.mmu.wram[0xFF01]!=this.mmu.serial)
            {
                this.mmu.debugInfo += " "+this.mmu.wram[0xFF01].toString(2);
                this.mmu.serial = this.mmu.wram[0xFF01];
                console.log(this.mmu.debugInfo);
            }
            //*/
            cyclesInstructionTook = this.cpu.executeOpCode(this.mmu.read(this.cpu.PC_reg));
            if(cyclesInstructionTook===undefined)
            {
                var address = (this.mmu.currentROMBank-1)*0x4000+this.cpu.PC_reg;
                //console.log("failure at adress "+address.toString(16));
                //console.log("instruction: "+emulator.mmu.rom[address].toString(16));
                this.gameOn = false;
            }
            this.gpu.doGraphics(cyclesInstructionTook);
            this.timer.updateTimer(cyclesInstructionTook);
            this.serial.doSerial(cyclesInstructionTook);

            this.cpu.interruptSwitching();
            cyclesElapsed += this.cpu.handleInterrupts();
            this.cpu.checkHalt();
            cyclesElapsed += cyclesInstructionTook;
        }
        draw();
    }
}