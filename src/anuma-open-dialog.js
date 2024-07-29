import {html, css, AnumaDialog, i18n, T} from './anuma-dialog.js';
import {askForPassword, baseUrl} from "./wallet.js";
const pass = "";

class AnumaOpenDialog extends AnumaDialog{

	static get properties() {
		return {
			mode:{type:String, reflect:true},
			inputType:{type:String},
			isFresh:{type:Boolean, reflect:true},
			hideLogo:{type:Boolean, reflect:true}
		};
	}

	static get styles(){
		return [AnumaDialog.styles, css`
			.container{max-height:var(--anuma-dialog-container-max-height, 600px)}
			:host([mode="create"]) .container{max-height:var(--anuma-dialog-container-max-height, 500px)}
			:host([mode="init"]) .container{max-height:var(--anuma-dialog-container-max-height, 200px)}
			:host([mode="recover"]) .container{max-height:var(--anuma-dialog-container-max-height, 450px)}
			.buttons{justify-content:center;--anuma-dialog-buttons-width:100%;}
			:host([mode="init"]) .buttons{justify-content:center}
			:host([mode="open"]) .inner-body{padding:0px 30px;}

			.text-center, .heading{text-align:center;}
			.words{margin:20px 0px;max-width:500px;margin:auto;}
			.words .row{display:flex;justify-content:center;}
			.words .cell{flex:1;width:10px;text-align:center;padding:5px}
			input.seed{
				border:2px solid var(--flow-primary-color);
				border-radius:7px;padding:10px 5px;max-width:120px;
				text-align:center;width:100%;box-sizing:border-box;
			}
			:host[isFresh] .close-btn{display:none}
			.big-logo{max-width:150px;margin:10px auto 20px;display:block;}
			.bottom-spacer{height:200px}
		`];
	}
	constructor() {
		super();

		window.showWalletInitDialog = (args, callback)=>{
			this.cleanUpForm();
			//return callback(null, {password:"Asd123###", dialog:this, mode:"open"});
			this.wallet = args.wallet;
			this.hideable = !!args.hideable;
			this.mode = args.mode||"open";
			this.lastMode = this.mode;
			this.callback = callback;
			this.isFresh = !!args.isFresh;

			this.args = args;
			this.show();
		}

		window.hideWalletInitDialog = ()=>{
			this.hide();
		}

		this.mode = "init";
		this.inputType = "password";
	}
	buildRenderArgs(){
		let {mode} = this;
		let modeName = mode[0].toUpperCase()+mode.substr(1);
		return {modeName};
	}
	renderHeading({modeName}){
		if(modeName == 'Init')
			return '';
		return html`${T(`${modeName} Wallet`)}`;
	}
	renderBody({modeName}){
		return this[`render${modeName}UI`]();
	}
	renderButtons({modeName}){
		return this[`render${modeName}Buttons`]?.()||'';
	}
	renderInitUI(){
		return html`
			<div class="sub-heading text-center" is="i18n-div">Welcome to Anuma Wallet</div>
		`
	}
	renderRecoverUI(){
		let rows = [0, 1, 2];
		let cells = [0, 1, 2, 3];
		let seed = [];
		return html`
			<p class="sub-heading text-center" is="i18n-p">
				Enter your 12-word seed phrase to recover your wallet (words are not case sensitive)
			</p>
			<div class="words" @input=${this.onSeedInput}>
				${rows.map((v, index)=>{
					return html`
					<div class="row">
						${cells.map((v, i)=>{
							return html`
							<div class="cell">
								<input class="seed word" value="${seed[index*4+i]||''}" data-index="${index*4+i}" />
							</div>
							`;
						})}
					</div>
					`;
				})}
			</div>
			<div class="error">${this.errorMessage}</div>
		`
	}
	renderOpenUI(){
		let icon = this.inputType=="password"?'eye':'eye-slash';
		return html`
			${this.hideLogo?'': html`
			<div>
				<img class="big-logo" src="${baseUrl+'/resources/images/anuma.png'}" />
			</div>`}
			<div class="sub-heading" is="i18n-div">Unlock the wallet with your password:</div>
			<flow-input class="password full-width" outer-border value="${pass}"
				type="${this.inputType}" placeholder="${T('Password')}"
				@keyup="${this.onOpenPassKeyup}">
				<fa-icon class="input-type-btn" slot="sufix"
					@click="${this.changeInputType}"
					icon="${icon}"></fa-icon>
			</flow-input>
			<div class="error">${this.errorMessage}</div>
			<div class='buttons'>${this._renderOpenButtons()}</div>
			<div class="bottom-spacer" ?hidden=${!isMobile}></div>
		`
	}
	renderCreateUI(){
		let icon = this.inputType=="password"?'eye':'eye-slash';
		return html`
			<div class="sub-heading" is="i18n-div">Create a password for your new wallet</div>
			<flow-input class="password full-width" outer-border value="${pass}"
				type="${this.inputType}" placeholder="${T('Password')}">
				<fa-icon class="input-type-btn" slot="sufix"
					@click="${this.changeInputType}"
					icon="${icon}"></fa-icon>
			</flow-input>
			<div class="sub-heading" is="i18n-div">Confirm password</div>
			<flow-input class="cfm-password full-width" outer-border value="${pass}"
				type="${this.inputType}" placeholder="${T('Confirm Password')}"
				@keyup="${this.onCreatePassKeyup}">
				<fa-icon class="input-type-btn" slot="sufix"
					@click="${this.changeInputType}"
					icon="${icon}"></fa-icon>
			</flow-input>
			<div class="error">${this.errorMessage}</div>
		`
	}
	_renderOpenButtons(){
		return html`
			<flow-btn @click="${e=>this.mode='create'}" i18n>NEW WALLET</flow-btn>
			<flow-btn primary @click="${this.openWallet}" i18n>OPEN WALLET</flow-btn>`;
	}
	renderCreateButtons(){
		return html`
			<flow-btn @click="${e=>this.mode=this.lastMode}" i18n>Cancel</flow-btn>
			<flow-btn ?hidden=${this.isFresh} 
				@click="${e=>this.mode='recover'}" i18n>I have a wallet</flow-btn>
			<flow-btn primary @click="${this.showSeeds}" i18n>Next</flow-btn>
			`;
	}
	renderInitButtons(){
		return html`
			<flow-btn class="primary"
				@click="${e=>this.mode='create'}" i18n>Create New Wallet</flow-btn>
			<flow-btn class="primary"
				@click="${e=>this.mode='recover'}" i18n>Recover from Seed</flow-btn>`;
	}
	renderRecoverButtons(){
		
		return html`
			<flow-btn @click="${this.cancelRecover}" i18n>Cancel</flow-btn>
			<flow-btn primary @click="${this.recoverWallet}" i18n>Recover Wallet</flow-btn>`;
	}
	cancelRecover(){
		if(this.args?.backToWallet){
			return this.hide()
		}
		this.mode = this.lastMode || "init";
	}
	updated(changes){
        super.updated(changes);
        if(changes.has('mode')){
        	this.inputType = "password";
        	this.errorMessage = "";
        }
    }

    changeInputType(){
    	this.inputType = this.inputType=="password"?'text':'password';
    }
    onOpenPassKeyup(e){
    	if(e.which == 13)
    		this.openWallet();
    }
    openWallet(){
    	let password = this.qS(".password").value;

		this.callback(null, {password, dialog:this});
    }
    onCreatePassKeyup(e){
    	if(e.which == 13)
    		this.showSeeds();
    }
    showSeeds(){
    	let password = this.qS(".password").value.trim();
    	let password2 = this.qS(".cfm-password").value;
    	if(!this.checkPassword(password))
    		return this.setError(i18n.t("At least 8 characters, one capital, one lower, one number, and one symbol"))

    	if(password != password2)
    		return this.setError(i18n.t("Passwords do not match"))

    	this.callback(null, {mode:"create", password, dialog:this});
    }
    onSeedInput(e){
		let input = e.target.closest("input.seed");
    	if(!input || input.dataset.index != "0")
    		return
		let words = (input.value+"").trim().split(" ");
    	if(words.length<12)
    		return;

    	this.qSAll("input.seed.word").forEach(input=>{
			let index = input.dataset.index;
			if(words[index] == undefined)
				input.value = "";
			else
    			input.value = words[index];
		});

    }
    recoverWallet(){
    	let wordsMap = {};
    	let isInvalid = false;
    	this.qSAll("input.seed.word").forEach(input=>{
			let index = input.dataset.index;
    		wordsMap[index] = (input.value+"").trim();
    		if(input.value.length<2)
    			isInvalid = true;
    	});

    	let words = [];
    	for(let i=0; i<12; i++){
    		words.push(wordsMap[i])
		}

    	if(isInvalid || !words.join("").length)
    		return this.setError(i18n.t("Please provide valid words"));

    	askForPassword({
    		title:i18n.t("Password to encryt the wallet"),
    		confirmBtnText:i18n.t("Encrypt Wallet")
    	}, ({btn, password})=>{
    		if(!password || btn != 'confirm')
    			return

	    	this.callback(null, {seedPhrase:words.join(" ").toLowerCase(), password, dialog:this});
	    })
	}
	
	cleanUpForm(){
		this.qSAll("input.seed.word").forEach(input=>{
    		input.value = "";
		})
	}
}

AnumaOpenDialog.define("anuma-open-dialog");
