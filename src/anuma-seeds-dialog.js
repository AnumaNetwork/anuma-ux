import {
	html, css, AnumaDialog, chunks, getRandomInt, shuffle,
	T, i18n
} from './anuma-dialog.js';

class AnumaSeedsDialog extends AnumaDialog{

	static get properties() {
		return {
			step:{type:Number, reflect:true},
			inputType:{type:String},
			mnemonic:{type:String}
		};
	}

	static get styles(){
		return [AnumaDialog.styles, css`
			.heading{text-align:center}
			.container{max-height:var(--anuma-dialog-container-max-height, 660px)}
			.buttons{justify-content:flex-end}
			.dull-text{opacity:0.5}
			.text-center{text-align:center;}
			.words{margin:20px 0px;}
			.words .row, .button-row{display:flex;justify-content:center;}
			.words .cell{flex:1;text-align:center;padding:5px;user-select:none}
			.words .word{margin:4px;color:var(--flow-primary-color);user-select:initial}
			.dots{text-align:center;padding:10px;}
			.dots .dot{margin:2px}
			.button-row{margin:20px 0px;flex-wrap: wrap;}
			.button-row flow-btn{margin:10px; flex:1;--flow-btn-display:inline-block}
			.dot[icon="check"]{--fa-icon-color:var(--flow-primary-color)}
			.dot[icon="times"]{--fa-icon-color:#F00;}
			.varification-msg{margin-bottom:5px;text-align:center}
			.varification-title{margin:20px 5px;text-align:center}
			.success-msg{text-align:center;margin-top:65px}
			.varification-msg-box{min-height:80px;}
		`];
	}
	constructor() {
		super();
		this.hideable = true;
		this.step = 1;
	}
	open(args, callback){
		this.step = args.step||1;
		this.callback = callback;
		this.args = args;
		this.mnemonic = args.mnemonic;
		this.hideable = !!args.hideable
		this.show();
	}
	buildRenderArgs(){
		let {step} = this;
		let stepName = `Step${step}`;
		return {stepName};
	}
	renderHeading({stepName}){
		return html`${this.hideable?this.renderBackBtn():''} ${T('Recovery Seed')}`;
	}
	renderBody({stepName}){
		return this[`render${stepName}`]();
	}
	renderButtons({stepName}){
		return this[`render${stepName}Buttons`]();
	}
	renderStep1(){
		if(!this.mnemonic)
			return '';
		let {mnemonic} = this;
		let words = mnemonic.split(" ");
		const wordRows = chunks(words, 4);
		let indexes = [];
		while(indexes.length<3){
			let n;
			do{
				n = getRandomInt(0, 11);
			}while(indexes.includes(n));

			indexes.push(n);
		}
		this.words = words;
		this.correctWords = indexes.map(index=>words[index]);
		this.indexes = indexes;
		let otherWords = words;
		this.indexes.forEach(index=>{
			otherWords.splice(index, 1);
		})
		this.otherWords = shuffle(otherWords);
		this.varificationStep = 0;
		this.varificationStepAnswered = '';

		return html`
			<p is="i18n-p">
				Your wallet is accessible by a seed phrase.
				The seed phrase is an ordered 12-word secret phrase.
			</p>
			<p is="i18n-p">
				Make sure no one is looking, as anyone with your
				seed phrase can access your wallet your funds.
				Write it down and keep it safe.
			</p>
			<div class="words">
				${wordRows.map((words, index)=>{
					return html`
					<div class="row">
						${words.map((word, i)=>{
							return html`
							<div class="cell">
								<div class="word">${word}</div>
								${index*4+i+1}
							</div>
							`;
						})}
					</div>
					`;
				})}
			</div>
			<p class="dull-text text-center" is="i18n-p">
				Cool fact: there are more 12-word phrase combinations than nanoseconds
				since the big bang!
			</p>	
		`
	}
	renderStep2(){
		let otherWords = chunks(this.otherWords, 3);
		let words = otherWords[this.varificationStep];
		words.push(this.correctWords[this.varificationStep])
		words = shuffle(words);
		let index = this.indexes[this.varificationStep];
		let numToStr = (num)=>{
			return num+(({"1":"st", "2":"nd", "3":"rd"})[num]||'th');
		}
		let msg = i18n.t(`Make sure you wrote the phrase down correctly by 
				answering this quick checkup.`);
		let subMsg = '';
		if(this.varificationStepAnswered == 'error'){
			msg = i18n.t('Wrong. Retry or go back');
		}else if(this.varificationStep>0){
			if(this.varificationStep==1){
				msg = i18n.t('Good job! Two more checks to go');
				subMsg = i18n.t(`Be wary and cautious of your secret phrase.
						Never reveal it to anyone.`)
			}
			else{
				msg = i18n.t('Awesome, one more to go!');
				subMsg = i18n.t(`It is recommended to keep several copies of your secret
						seed hidden away in different places.`)
			}
		}
		let numStr = i18n.t(numToStr(index+1));
		let varTitle = i18n.t(`What is the [x] word?`).replace('[x]', numStr);
		return html`
			<div class="dots">
				${this.indexes.map((v, index)=>{
					let icon = this.varificationStepAnswered?'times':'circle';
					if(index<this.varificationStep)
						icon = "check";
					else if(index>this.varificationStep)
						icon = "circle";
					return html`<fa-icon class="dot" icon="${icon}"></fa-icon>`
				})}
			</div>
			<div class="varification-msg-box">
				<p class="varification-msg">${msg}</p>
				<div ?hidden=${!subMsg} class="sub-msg dull-text">${subMsg}</div>
			</div>
			<div class="varification-title">${varTitle}</div>
			<!--div>${this.correctWords[this.varificationStep]} ${this.varificationStepAnswered}</div-->
			<div class="button-row" @click="${this.wordClick}">
				${words.map(word=>{
					return html`
					<flow-btn class="cell" data-word="${word}">
						${word}
					</flow-btn>
					`;
				})}
			</div>
		`
	}
	renderStep3(){
		return html`
			<div class="dots">
				<fa-icon class="dot" icon="check"></fa-icon>
				<fa-icon class="dot" icon="check"></fa-icon>
				<fa-icon class="dot" icon="check"></fa-icon>
			</div>
			<p class="text-center" is="i18n-p">Great Success!</p\]>
			<p class="success-msg" is="i18n-p">
				Remember...<br />
				Anyone with this 12-word phrase can access your wallet your funds.
				Keep it safe!
			</p>
		`
	}
	renderStep1Buttons(){
		if(this.args?.showOnlySeed)
			return
		return html`<flow-btn primary @click="${e=>this.step=2}" i18n>NEXT</flow-btn>`
	}
	renderStep2Buttons(){
		return html`<flow-btn primary @click="${e=>this.step=1}" i18n>BACK TO THE WORDS</flow-btn>`
	}
	renderStep3Buttons(){
		return html`<flow-btn primary @click="${this.finish}" i18n>DONE</flow-btn>`
	}
	updated(changes){
        super.updated(changes);
        if(changes.has("step")){
        	this.inputType = "password";
        }
    }
    changeInputType(){
    	this.inputType = this.inputType=="password"?'text':'password';
    }
    wordClick(e){
    	let btn = e.target.closest("flow-btn");
    	if(!btn)
    		return
    	let word = btn.dataset.word;
    	if(this.correctWords[this.varificationStep] == word){
    		if(this.varificationStep == 2){
    			this.step = 3;
    			return
    		}
    		this.varificationStepAnswered = '';
    		this.varificationStep += 1;
    		this.requestUpdate("answered", null);
    		return
    	}

    	this.varificationStepAnswered = 'error';
    	this.requestUpdate("answered", null);
    }

    finish(){
    	this.callback({finished:true, dialog:this});
    	this.callback = null;
    	this.hide();
    }
    hide(skipHistory=false){
    	this.mnemonic = "";
    	super.hide(skipHistory);
    }

}

AnumaSeedsDialog.define("anuma-seeds-dialog");
