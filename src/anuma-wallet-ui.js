import {
	html, css, BaseElement, ScrollbarStyle, SpinnerStyle,
	dpc, FlowFormat, buildPagination, renderPagination, txListStyle, UID, T, i18n,
	i18nHTMLFormat, throttle
} from './flow-ux.js'
export * from './flow-ux.js'
import {
	Deferred, GetTS, ANUM, formatForMachine, formatForHuman,
	getLocalWallet, setLocalWallet, baseUrl, debug, MAX_UTXOS_THRESHOLD_COMPOUND,
	getCacheFromStorage,
	saveCacheToStorage, CONFIRMATION_COUNT, COINBASE_CFM_COUNT,
	askForPassword
} from './wallet.js';
export * from './wallet.js';
import {initAnumaFramework, Wallet, workerLog} from '@anuma/wallet-worker';
export {Wallet};
Wallet.setWorkerLogLevel(localStorage.walletWorkerLogLevel || 'none')

export {html, css, FlowFormat, dpc, baseUrl, debug};

export class AnumaWalletUI extends BaseElement{

	static get properties() {
		return {
			wallet:{type:Object},
			autoCompound:{type:Boolean},
			useLatestAddressForCompound:{type:Boolean},
			isLoading:{type:Boolean},
			isOnline:{type:Boolean},
			isOfflineBadge:{type:Boolean},
			errorMessage:{type:String},
			receiveAddress:{type:String},
			changeAddress:{type:String},
			blueScore:{type:Number},
			status:{type:String},
			walletMeta:{type:Object, value:{}},

			faucetFundsAvailable:{type:Number},
			faucetPeriod:{type:Number},
			faucetStatus:{type:String},
			ip:{type:String},

			blockCount:{type:Number},
			headerCount:{type:Number},
			difficulty:{type:Number},
			networkName:{type:String},
			pastMedianTime:{type:Number},
			pastMediaTimeDiff:{type:Number},
			dots:{type:String},
			hideFaucet:{type:Boolean},
			hideNetwork:{type:Boolean},
			hideDebug:{type:Boolean},
			hideQRScanner:{type:Boolean},
			hideOpenWalletLogo:{type:Boolean},
			skipUTXOIndexCheck:{type:Boolean}
		};
	}

	static get styles(){
		return [ScrollbarStyle, SpinnerStyle, txListStyle, css`
			.v-box{display:flex;flex-direction:column}
			.hide-scrollbar::-webkit-scrollbar-track{
			    box-shadow:none;background:transparent;
			}
			.hide-scrollbar::-webkit-scrollbar{
				width:0px;height:0px;
				background:transparent;
			}
			.hide-scrollbar::-webkit-scrollbar-thumb{
			    box-shadow:none;background:transparent;
			}
			.recent-transactions {padding:15px;max-width:555px;margin:auto;}
			.recent-transactions .tx-rows{max-height:90vh;overflow-y:auto;margin:10px 0px;padding:0px 10px;}
			.recent-transactions .tx-body{overflow:hidden;text-overflow:ellipsis;}
			.recent-transactions .tx-body .tx-id,
			.recent-transactions .tx-body .tx-address{
				font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;
			}
			.recent-transactions .tx-title{width:100%;display:flex;align-items:center;margin-bottom:10px;}
			.recent-transactions .tx-row{position:relative}
			.recent-transactions .tx-progressbar{position:absolute;left:0px;}
			.recent-transactions .amount{color:#60b686}
			.recent-transactions [txout] .amount{color:#F00}
			.recent-transactions .heading { text-align:center;}
			.tx-notification{padding:5px;text-align:center}
			.hidden-file-input{position:absolute;top:-100%;}
			div.info-table{display:table;border-collapse:collapse;}
			div.info-table>div{display:table-row;}
			div.info-table>div>div{
				display:table-cell;
				padding: 2px 4px;
				border: 1px solid rgba(200, 200, 200, 0.2);
				text-align: center;
			}
			.reload-utxo-btn{
				position:relative;
				top:20px;
				cursor:pointer;
				margin:0px 10px;
			}
			.download-transactions-btn{
				cursor:pointer;
				margin:0px 0px 0px 10px;
			}
			a{
				color:var(--flow-primary-color);
				text-decoration:none;
			}
			.transactions-update-status{
				text-align: center;
				font-size: 0.8rem;
				margin-bottom: 20px;
			}
		`];
	}
	constructor() {
		super();
		this.txs = [];
		this.utxos = new Map();
		this.walletSignal = Deferred();
		this.walletMeta = {};
		this.isOnline = false;
		this.txLimit = Math.floor( (window.innerHeight - 165) / 72);
		this.utxosLimit = this.txLimit;
		this.hideUTXOs = true;

		this.isOfflineBadge = false;
		this.debugscanner = window.location.href.includes("debugscanner")
		this.preparingTxNotifications = new Map();
		this.dots = '';
		this.UTXOIndexSupport = true;
		this.recentTransactionsHeading = i18n.t("Recent Transactions");
		this.walletDebugInfo = {};
		this.reloadingUTXOs = false;

		this.throttledCompoundUTXO = throttle(async ()=>{
			if(this.waitingForCompound)
				return
			this.waitingForCompound = true;
			if (this.autoCompound){
				await this._compoundUTXOs(15000, false);
				this.waitingForCompound = false;
				return
			}

			let body = html`
				This wallet has too many transactions<br >
				would you like to compound by re-sending funds to yourself?
			`;
			let {btn} = await FlowDialog.alert({
				title:i18n.t("Too many transactions"),
				body,
				cls:'',
				btns:[{
					text:i18n.t('Close'),
					value:'cancel'
				},{
					text:i18n.t('Yes Compound'),
					cls:'primary',
					value:'compound'
				}]
			})

			if(btn=='compound'){
				await this.compoundUTXOs();
			}
			this.waitingForCompound = false;
		}, 1000)
	}

	setRPCBuilder(rpcBuilder){
		this.rpcBuilder = rpcBuilder;
	}

	async initNetworkSettings() {
		if(this.rpc) {
			this.rpc.disconnect();
			// !!! FIXME delete wallet instance?
			delete this.rpc;
		}

		if(!this.rpcBuilder)
			return false;
		
		//const { network, port } = this.local_anumad_settings;
		//const port = Wallet.networkTypes[network].port;
		const {rpc, network} = this.rpcBuilder();//new RPC({ clientConfig:{ host : `127.0.0.1:${port}` } });
		this.network = network;
		this.rpc = rpc;
	}
	disconnectRPC(){
		if(this.rpc)
			this.rpc.disconnect()
	}
	async connectRPC(){
		if(this.rpc)
			return this.rpc.connect()
	}

	initDaemonRPC() {
		if(this.networkStatusUpdates || !window.flow?.app?.rpc?.subscribe)
			return
		const { rpc } = flow.app;
		this.networkStatusUpdates = rpc.subscribe(`network-status`);
		(async()=>{
			for await(const msg of this.networkStatusUpdates) {

				const {
					blockCount,
					headerCount,
					difficulty,
					networkName,
					pastMedianTime,
					pastMedianTimeDiff
				} = msg.data;

				this.blockCount = blockCount;
				this.headerCount = headerCount;
				this.difficulty = difficulty;
				this.networkName = networkName;
				this.pastMedianTime = pastMedianTime;
				this.pastMedianTimeDiff = pastMedianTimeDiff;
			}
		})().then();
	}

	initHelpers() {
		if(this._initHelpersInterval)
			return;

		this._initHelpersInterval = setInterval(()=>{
			if(this.faucetPeriod > 0) {
				this.faucetPeriod = Math.max(0,this.faucetPeriod-1000);
			}
		}, 1000);
	}

	render(){
		return html``
	}

	renderTX({hideTxBtn=false, onlyNonConfirmed=false}={}){
		if(!this.wallet)
			return '';

		let items = [], bScore;
		let {blueScore=0} = this;
		if(onlyNonConfirmed){
			if(blueScore){
				items = this.txs.slice(0, 6).filter(tx=>{
					bScore = tx.blueScore||0;
					if(blueScore<bScore || !bScore)
						return false
					return (blueScore - bScore < (tx.isCoinbase? COINBASE_CFM_COUNT : CONFIRMATION_COUNT))
				})
			}
		}else{
			items = this.txs.slice(0, 10)
		}
		if(hideTxBtn && !items.length && !this.preparingTxNotifications.size)
			return '';

		let color, p, cfmP, cfm;

		let notifications = [...this.preparingTxNotifications.values()];

		return html`
		<div class="recent-transactions">
			<div class="heading">
				${this.recentTransactionsHeading}
			</div>
			<div class="tx-notifications">
				${notifications.map(n=>{
					return html`<div class="tx-notification">
						${n.compoundUTXOs?
							T(`Compounding UTXOs...`):
							i18n.t(`Preparing transaction for [n] ANUM ....`)
							.replace('[n]', this.formatANUM(n.amount))}
					</div>`
				})}
				
			</div>
			<div class="tx-rows">
			${items.map(tx=>{
				let COUNT = tx.isCoinbase? COINBASE_CFM_COUNT : CONFIRMATION_COUNT;
				cfm = blueScore - (tx.blueScore||0);
				cfmP = Math.min(COUNT, cfm);
				p = cfmP/COUNT;
				if(p>0.7)
					color = '#60b686';
				else if(p>0.5)
					color = 'orange'
				else
					color = 'red';

				return html`
					<flow-expandable class="tx-row" static-icon expand ?txin=${tx.in} ?txmoved=${tx.isMoved} ?txout=${!tx.in}
						icon="${tx.in?'sign-in':'sign-out'}" no-info>
						<div class="tx-title" slot="title">
							<div class="tx-date flex">${tx.date}</div>
							<div class="amount">
								${tx.in?'':'-'}${this.formatANUM(tx.amount)} ANUM
							</div>
						</div>
						${ 0<=cfm&cfm<=COUNT? html`<flow-progressbar class="tx-progressbar" 
							style="--flow-progressbar-color:${color}"
							value="${p}" text="${cfmP||''}"></flow-progressbar>`:''
						}
						<div class="tx-body">
							${tx.note}
							<div class="tx-id">
								<a target="_blank" href="https://explorer.anuma.network/txs/${tx.id}">${tx.id}</a>
							</div>
							<div class="tx-address">
								${tx.myAddress?T('COMPOUNDING WALLET => '):''}
								<a target="_blank" href="https://explorer.anuma.network/addresses/${tx.address}">${tx.address}</a>
							</div>
						</div>
					</flow-expandable>
				`
			})}
			</div>
		</div>`
	}
	_renderAllTX({skip, items}){
		let {blueScore=0} = this, cfm, cfmP, p, color, bScore;
		return html`
			${items.length?'':html`<div class="no-record" is="i18n-div">No Transactions</div>`}
			<div class="tx-list">
				${items.map((tx, i)=>{
					let COUNT = tx.isCoinbase? COINBASE_CFM_COUNT : CONFIRMATION_COUNT;
					bScore = tx.blueScore||0;
					cfm = blueScore - bScore;
					if(blueScore < bScore)
						cfm = COUNT+1;
					cfmP = Math.min(COUNT, cfm)
					p = cfmP/COUNT;
					if(p>0.7)
						color = '#60b686';
					else if(p>0.5)
						color = 'orange'
					else
						color = 'red';
					return html`
					<div class="tx-row" ?txin=${tx.in} tx-version=${tx.version} ?txmoved=${tx.isMoved} ?txout=${!tx.in}>
						<fa-icon class="tx-icon" icon="${tx.in?'sign-in':'sign-out'}"></fa-icon>
						${
							0<=cfm&cfm<=COUNT? html`
							<flow-progressbar class="tx-progressbar" 
								style="--flow-progressbar-color:${color}"
								value="${p}" text="${cfmP||''}"></flow-progressbar>
							`:''
						}
						<div class="tx-date" title="#${skip+i+1} Transaction">${tx.date}</div>
						<div class="tx-amount">${tx.in?'':'-'}${ANUM(tx.amount)} ANUM</div>
						<div class="br tx-note">${tx.note}</div>
						<div class="br tx-id">
							<a target="_blank" href="https://explorer.anuma.network/txs/${tx.id.split(":")[0]}">${tx.id.split(":")[0]}</a>
						</div>
						<div class="tx-address">
							${tx.myAddress?T('COMPOUNDING WALLET => '):''}
							<a target="_blank" href="https://explorer.anuma.network/addresses/${tx.address}">${tx.address}</a>
						</div>
					</div>`
				})}
			</div>
		`
	}

	async forceTxTimeUpdate(){
		this.selectTab("wallet");
		await this.updateTransactionsTimeImpl(10);
	}
	async updateTransactionsTime(){
		await this.updateTransactionsTimeImpl();
	}

	async updateTransactionsTimeImpl(version){
		if(!this.wallet)
			return
		if (this.updatingTransactionsTime){
			FlowDialog.alert(
				i18n.t('Updating transaction times'),
				i18n.t('Transactions update process is in-progress'),
			);
			return
		}

		let {btn} = await FlowDialog.alert({
			title:i18n.t('Update transaction times'),
			body:html`<div>${i18n.t('Updating transaction times may take time if you have a lot of transactions,')}</div>
					 <div>${i18n.t('are you sure?')}</div>`,
			cls:'with-icon',
			btns:[{
				text:i18n.t('Cancel'),
				value:'cancel'
			},{
				text:i18n.t('Update'),
				value:'update',
				cls:'primary'
			}]
		})
		if(btn != 'update')
			return
	
		this.updatingTransactionsTime = true;
		this.requestUpdate("updatingTransactionsTime", null);

		return new Promise((resolve)=>{
			dpc(2000, async()=>{
				//let version = localStorage.force_tx_time==1?5:undefined;
				//console.log("force_tx_time:version", version);
				let response = await this.wallet.startUpdatingTransactions(version)
				.catch(err=>{
					console.log("updateTransactionsTime error", err)
					let error = err.error || err.message || i18n.t('Unable to update transactions time. Please retry later.');
					FlowDialog.alert(
						i18n.t('Transactions update process failed'),
						html`${error}${this.buildDebugInfoForDialog(err)}`
					)
				})
				if(response)
					console.log("updateTransactionsTime response", response)
				resolve()
			})
		})
	}

	exportTransactions(){
		let {txs:items=[], blueScore=0} = this;

		let fields = ["date", "id", "address", "amount", "direction", "confirmation", "note", "compounding wallet"];
		let rows = [];

		rows.push(fields.map(field=>{
			return field.toUpperCase()
		}).join(","))

		let escape = str=>{
			return `"${str.replaceAll('"', '""')}"`
		}

		items.map((tx, i)=>{
			if (tx.isMoved){
				return
			}
			let COUNT = tx.isCoinbase? COINBASE_CFM_COUNT : CONFIRMATION_COUNT;
			let bScore = tx.blueScore||0;
			let cfm = blueScore - bScore;
			if(blueScore < bScore)
				cfm = COUNT+1;
			let cfmP = Math.min(COUNT, cfm)
			cfm = (cfmP/COUNT).toFixed(2);
			let row = [];
			fields.forEach(field=>{
				switch(field){
					case 'id':
						row.push(tx.id.split(":")[0])
					break;
					case 'address':
						row.push(tx.address)
					break;
					case 'amount':
						row.push(escape(`${tx.in?'':'-'}${ANUM(tx.amount)}`))
					break;
					case 'direction':
						row.push(tx.in?'RECEIVE':'SEND')
					break;
					case 'confirmation':
						row.push(cfm)
					break;
					case 'note':
						row.push(escape(tx.note||''))
					break;
					case 'compounding wallet':
						row.push(tx.myAddress?'YES':'')
					break;
					case 'date':
						if (tx.version==1){
							row.push('N/A');
						}else if (tx.version==2){
							row.push(tx.date)
						}else{
							row.push('')
						}
					break;

				}
			});

			rows.push(row.join(","));
		})

		let csvData = rows.join("\n");
		this.sendDataToDownload(csvData, 'transactions.csv')
	}
	renderAllTX(){
		if(!this.wallet)
			return '';
		let {txLimit:limit=20, txs:totalItems=[], txSkip=0} = this;
		let pagination = buildPagination(totalItems.length, txSkip, limit)
		let items = totalItems.slice(txSkip, txSkip+limit);
		return html`
			${this._renderAllTX({skip:txSkip, items})}
			${renderPagination(pagination, this._onTXPaginationClick)}
		`
	}
	_renderUTXOs({skip, items}){
		let noRecordMsg = this.reloadingUTXOs?
			html`<div class="no-record" is="i18n-div">Loading...</div>`:
			html`<div class="no-record" is="i18n-div">No UTXOS</div>`;

		return html`
			${items.length?'':noRecordMsg}
			<div class="tx-list">
				${items.map((tx, i)=>{
					return html`
					<div class="tx-row" ?iscoinbase=${!tx.isCoinbase}>
						<div class="tx-date" title="#${skip+i+1} UTXO">
							${tx.blockDaaScore} (${tx.mass})
						</div>
						<div class="tx-amount">${ANUM(tx.satoshis)} ANUM</div>
						<div class="br tx-mass"></div>
						<div class="br tx-id">
							<a target="_blank" href="https://explorer.anuma.network/txs/${tx.txId}">${tx.id}</a>
						</div>
						<div class="tx-address">
							<a target="_blank" href="https://explorer.anuma.network/addresses/${tx.address}">${tx.address}</a>
						</div>
					</div>`
				})}
			</div>
		`
	}

	renderUTXOs(){
		if(!this.wallet)
			return '';
		let {utxosLimit:limit=20, utxos:totalItems, utxoSkip:skip=0} = this;
		let pagination = buildPagination(totalItems.size, skip, limit)
		let items = [...totalItems.values()].slice(skip, skip+limit);
		return html`
			${this._renderUTXOs({skip, items})}
			${renderPagination(pagination, this._onUTXOPaginationClick)}`
	}

	onMenuClick(e){
		let target = e.target.closest("flow-menu-item")
		let action = target.dataset.action;
		if(!action)
			return
		if(!this[action])
			return
		this[action]()
	}

	async showSeeds(){
		askForPassword({confirmBtnText:i18n.t("Next")}, async({btn, password})=>{
    		if(btn!="confirm")
    			return
    		let encryptedMnemonic = getLocalWallet().mnemonic;
    		let valid = await Wallet.checkPasswordValidity(password, encryptedMnemonic);
    		if(!valid)
    			return FlowDialog.alert(i18n.t("Error"), i18n.t("Invalid password"));
			let mnemonic = await this.wallet.mnemonic;
			this.openSeedsDialog({mnemonic, hideable:true, showOnlySeed:true}, ()=>{
				//
			})
		})
	}
	async exportWalletFile(){
		askForPassword({confirmBtnText:i18n.t("Next")}, async({btn, password})=>{
    		if(btn!="confirm")
    			return
    		let wallet = getLocalWallet();
    		let encryptedMnemonic = wallet.mnemonic;
    		let valid = await Wallet.checkPasswordValidity(password, encryptedMnemonic);
    		if(!valid)
    			return FlowDialog.alert(i18n.t("Error"), i18n.t("Invalid password"));
			
			this.sendDataToDownload(JSON.stringify(wallet), 'wallet.kpk')
		})
	}
	getFileInput(){
		return this.renderRoot.querySelector("input.hidden-file-input")
	}
	importWalletFile(){
		let input = this.getFileInput();
		let a = Date.now();
		let invalidFileAlert = ()=>{
			FlowDialog.alert(i18n.t("Error"), i18n.t("Invalid File"));
		}
		let importWallet = (walletMeta)=>{
			let {mnemonic} = walletMeta.wallet;

			askForPassword({confirmBtnText:"Import"}, async({btn, password})=>{
	    		if(btn!="confirm")
	    			return
				let valid = await Wallet.checkPasswordValidity(password, mnemonic)
				if(!valid)
					return FlowDialog.alert(i18n.t("Error"), i18n.t("Invalid password"));

				let walletInitArgs = {
					password,
					walletMeta,
					encryptedMnemonic:mnemonic,
					dialog:{
						mode:"import",
						setError:(error)=>{
							FlowDialog.alert(i18n.t("Error"), error);
						}
					}
				}
				//console.log("walletInitArgs", walletInitArgs)
				this.handleInitDialogCallback(walletInitArgs)
			})
		}
		input.onchange = (e)=>{
			let [file] = input.files||[]
			if(!file)
				return
			let {name=''} = file;
			let ext = name.toLowerCase().split(".").pop();
			if(ext!='kpk')
				return invalidFileAlert();

			let reader = new FileReader();
			let error = false;
			reader.onload = async (evt)=>{
				input.value = "";
				let json = evt.target.result;
				try{
					let walletInfo = JSON.parse(json);
					if(!walletInfo?.wallet?.mnemonic)
						return invalidFileAlert();
					importWallet(walletInfo);
				}catch(e){
					invalidFile()
				}
			};
			reader.onerror = ()=>{
				FlowDialog.alert(i18n.t("Error"), i18n.t("Unable to read file"));
				error = true;
				input.value = "";
			}
			reader.readAsText(file);
			console.log("input:onChange", a, e)
		}
		input.click();
	}

	sendDataToDownload(data, name="wallet.txt"){
		let file = new File([data], name, {
			type: "attachment/kpk",
		});
		const objectURL = URL.createObjectURL(file);
		this.requestFileDownload(objectURL, name);
	}

	requestFileDownload(file, name){
		let link = document.createElement("a")
		link.setAttribute("href", file);
		link.setAttribute("download", name || file);
		document.body.appendChild(link);
		link.click();
		setTimeout(()=>{
			link.remove();
		}, 3000);
	}

	async showRecoverWallet(){
		let title = html`<fa-icon class="big warning"
			icon="exclamation-triangle"></fa-icon> ${T('Attention !')}`;
		let body = html`
			<div style="min-width:300px;" is="i18n-div">
				You already have a wallet open. <br />
				Please make sure your current wallet <br />
				is backed up before proceeding!
			</div>
		`
		let {btn} = await FlowDialog.alert({
			title,
			body,
			cls:'with-icon', 
			btns:[{
				text:i18n.t('Cancel'),
				value:'cancel'
			},{
				text:i18n.t('Next'),
				value:'next',
				cls:'primary'
			}]
		})
		if(btn != 'next')
			return
		showWalletInitDialog({
			mode:"recover",
			wallet:this,
			backToWallet:true
		}, (err, info)=>{
			this.handleInitDialogCallback(info)
		})
	}

	copyAddress(){
		let input = this.renderRoot.querySelector(".address-input");
		this.copyInputToClipboard(input)
	}
	copyInputToClipboard(input){
		input.select();
		input.setSelectionRange(0, 99999)
		document.execCommand("copy");
		input.setSelectionRange(0,0)
		input.blur();
	}
	
	formatANUM(value){
		return ANUM(value);
	}
	showError(err){
		console.log("showError:err", err)
		this.errorMessage = err.error || err+"";
	}
	async setWallet(wallet){
		if(localStorage.walletLogLevel)
			wallet.setLogLevel(localStorage.walletLogLevel)
		//console.log("setWallet:", wallet)
		this.txs = [];
		this.receiveAddress = "";
		this.fire("new-wallet")
		await this.getWalletInfo(wallet);
		this.requestUpdate("txs", null)
		this.walletSignal.resolve();
		await this.loadData();
	}

	refreshStats() {
		this.isOfflineBadge = !this.isOnline;
		if(!this.isOnline){
			this.status = 'Offline';
			return;
		}

		let status = i18n.t('Online');
		if(this.blockCount == 1) {
			status = i18n.t(`Syncing Headers`);
		}
		else {
			if(this.sync && this.sync < 99.95)
				status = i18n.t(`Syncing DAG [n]`).replace('[n]', `${this.sync.toFixed(2)}%`);
		}
		this.status = status;
	}

	async onWalletReady({confirmedUtxosCount}){
		this.compoundIfNeeded(confirmedUtxosCount)
	}
	async compoundIfNeeded(utxoCount){
		if(utxoCount < MAX_UTXOS_THRESHOLD_COMPOUND)
			return
		this.throttledCompoundUTXO();
	}

	buildDebugInfoForDialog(err){
		let {debugInfo, extraDebugInfo} = err;
		if (debugInfo || extraDebugInfo){
			return html`
			<flow-expandable no-info>
				<div slot="title">More Info:</div>
				<div class="error-debug-info">
					${extraDebugInfo?JSON.stringify(extraDebugInfo):''}
					<br /><hr /><br />
					${debugInfo?JSON.stringify(debugInfo):''}
				</div>
			</flow-expandable>`;
		}
		return '';
	}

	compoundUTXOs(){
		return this._compoundUTXOs();
	}
	_compoundUTXOs(delay=500, errorAlert=true){
		const uid = UID();
		this.addPreparingTransactionNotification({uid, compoundUTXOs:true})
		return new Promise((resolve)=>{
			dpc(delay, async()=>{
				let useLatestChangeAddress = !!this.useLatestAddressForCompound;
				console.log("useLatestChangeAddress:"+useLatestChangeAddress)
				let response = await this.wallet.compoundUTXOs({useLatestChangeAddress})
				.catch(err=>{
					console.log("compoundUTXOs error", err, errorAlert)
					let error = err.error || err.message || i18n.t('Could not compound transactions. Please Retry later.');
					if(errorAlert && !error.includes("Amount is expected")){		
						FlowDialog.alert(
							i18n.t('Error'),
							html`${error}${this.buildDebugInfoForDialog(err)}`
						)
					}
				})
				if(response)
					console.log("compoundUTXOs response", response)

				this.removePreparingTransactionNotification({uid});

				resolve()
			})
		})
	}

	async showUTXOs(){
		if(this.utxosSyncStarted){
			this.selectTab("utxos");
			return
		}
		this.hideUTXOs = false;
		this.requestUpdate("hideUTXOs", true);
		dpc(500, async()=>{
			this.selectTab("utxos");
			this.utxosSyncStarted = true
			this.wallet.on("utxo-sync", ({utxos})=>{
				utxos.forEach(tx=>{
					this.utxos.set(tx.id, tx);
				})
				this.requestUpdate("utxos", null);
			})
			this.reloadUTXOs()
		})
	}

	reloadUTXOs(){
		this.reloadingUTXOs = true;
		this.utxos.clear();
		this.wallet.startUTXOsPolling();
		dpc(5000, ()=>{
			this.reloadingUTXOs = false;
		})
	}

	async scanMoreAddresses(){
		let {receiveEnd=-1, changeEnd=-1} = this._lastScan||{}
		dpc(500, async()=>{
			let response = await this.wallet.scanMoreAddresses(10000, false, receiveEnd, changeEnd)
			.catch(err=>{
				console.log("scanMoreAddresses error", err)
				let error = err.error || err.message || i18n.t('Could not scan more addresses. Please Retry later.');
				if(typeof error == 'string')
					FlowDialog.alert(i18n.t('Error'), error)
			})
			if(response){
				console.log("scanMoreAddresses response", response)
				let {receive, change} =  response;
				this._lastScan = this._lastScan||{};
				if (receive.end){
					this._lastScan.receiveEnd = receive.end-1;
				}
				if (change.end){
					this._lastScan.changeEnd = change.end-1;
				}
			}
		})
	}



	getWalletInfo(wallet){
		this.wallet = wallet;
		return new Promise((resolve, reject)=>{
	    	//this.uid = getUniqueId(await wallet.mnemonic);
		    wallet.on("ready", (args)=>{
		    	this.onWalletReady(args)
		    })
		    wallet.on('api-connect', ()=>{
				this.isOnline = true;
		    	this.refreshStats();
		    })
		    wallet.on('api-disconnect', ()=>{
		    	this.isOnline = false;
		    	this.refreshStats();
		    })
		    wallet.on("blue-score-changed", (e)=>{
				this.blueScore = e.blueScore;
				this.isOnline = true;
				this.refreshStats();
				this.txDialog?.requestUpdate()

				/*
				if(this.sync && this.sync < 99.75) {
					status = `Syncing ${this.sync.toFixed(2)}% `;
					if(this.eta && !isNaN(this.eta) && isFinite(this.eta)) {
						let eta = this.eta;
						eta = eta / 1000;
						let sec = Math.round(eta % 60);
						let min = Math.round(eta / 60);
						eta = '';
						if(sec < 10)
							sec = '0'+sec;
						if(min < 10) {
							min = '0'+min;
						}
						this.status_eta = `${min}:${sec}`;
						//status += eta;
					} else 
						this.status_eta = null;
				}
				else this.status_eta = null;
				*/

		    });
		    wallet.on("balance-update", ({confirmedUtxosCount})=>{
		    	this.requestUpdate("balance", null);
				//console.log("balance-update: confirmedUtxosCount: "+confirmedUtxosCount)
				if (this.autoCompound){
					this.compoundIfNeeded(confirmedUtxosCount);
				}
		    })
		    wallet.on("debug-info", ({debugInfo})=>{
		    	this.walletDebugInfo = {...this.walletDebugInfo, ...debugInfo}
		    	this.requestUpdate("walletDebugInfo", null);
		    })
			wallet.on("state-update", ({cache})=>{
				console.log("state-update", cache)
				saveCacheToStorage(cache);
			})
			wallet.on("moved-transaction", (tx)=>{
				let item = this.txs.find(t=>t.id==tx.id)
				if(item){
					item.isMoved = true;
					this.requestUpdate("balance", null);
				}
			})
			wallet.on("update-transactions", (list)=>{
		    	//console.log("############ update-transaction", list)
				list.forEach(tx=>{
					if (tx.ts){
						tx.date = GetTS(new Date(tx.ts));
					}
					let tx_old = this.txs.find(t=>t.id == tx.id);
					if (tx_old){
						Object.assign(tx_old, tx);
					}
				});
			})

			wallet.on("transactions-update-status", (info)=>{
		    	//console.log("############ transactions-update-status", info.status)
				if (info.status=="finished"){
					this.updatingTransactionsTime = false;
				}
				if (info.total != undefined){
					this.updatingTransactionsTimeStatus = Object.assign(
						this.updatingTransactionsTimeStatus||{},
						info
					);
				}
				this.requestUpdate("updatingTransactionsTimeStatus", null)
			})
		    wallet.on("new-transaction", (tx)=>{
		    	//console.log("############ new-transaction", tx)
		    	tx.date = GetTS(new Date(tx.ts));
		    	this.txs.unshift(tx);
		    	this.txs = this.txs.slice(0, 10000);
		    	this.requestUpdate("balance", null);
		    	if(this.txDialog)
		    		this.txDialog.onNewTx(tx)
		    })
		    wallet.on("transactions", (list)=>{
		    	//console.log("############ transactions", list.length)
		    	list.forEach(tx=>{
			    	tx.date = GetTS(new Date(tx.ts));
			    	let index = this.findTxIndex(tx);
			    	this.txs.splice(index, 0, tx);
			    })
		    })
		    wallet.on("new-address", (detail)=>{
		    	let {receive, change} = detail;
		    	this.receiveAddress = receive;
		    	this.changeAddress = change;
		    })

		    wallet.on("grpc-flags", (flags)=>{
		    	console.log("grpc-flags", flags)
				//console.log("grpc-flags:skipUTXOIndexCheck", this.skipUTXOIndexCheck)
		    	this.grpcFlags = flags;
		    	this.UTXOIndexSupport = !!flags.utxoIndex;
		    	if(!this.skipUTXOIndexCheck && !this.UTXOIndexSupport){
		    		this.alertUTXOIndexSupportIssue()
		    	}
		    	resolve();
		    })

			wallet.on("scan-more-addresses-started", ({receiveStart, changeStart})=>{
				console.log("scan-more-addresses-started: receiveStart, changeStart", receiveStart, changeStart)
				this.extraScanning = {
					status:"started",
					error:null,
					receiveStart,
					changeStart,
					receiveFinal:"",
					changeFinal:""
				};
				this.requestUpdate("extraScanning", null);
			})

			wallet.on("scan-more-addresses-ended", ({error, receiveFinal, changeFinal})=>{
				Object.assign(this.extraScanning, {
					status:"ended",
					error,
					receiveFinal,
					changeFinal
				});
				this.requestUpdate("extraScanning", null);
			})

			wallet.on("sync-progress", ({start, end, addressType})=>{
				if (this.extraScanning?.status == "started"){
					this.extraScanning[addressType+'Progress'] = end;
					this.requestUpdate("extraScanning", null);
				}
			})

		    wallet.checkGRPCFlags();
		})
	}

	renderExtraScaning(){
		if (!this.extraScanning){
			return ''
		}
		let {
			status,
			error,
			receiveStart,
			changeStart,
			receiveFinal,
			changeFinal,
			receiveProgress,
			changeProgress
		} = this.extraScanning;

		if (receiveProgress == receiveStart)
			receiveProgress = '';
		if (changeProgress == changeStart)
			changeProgress = '';

		return html`<div class="caption">${T(`Scanning ${status}`)}</div>
		${error?html`<div class="error">Error: ${error}</div>`:''}
		<div class="info-table">
			<div>
				<div is="i18n-div">Address</div>
				<div is="i18n-div">Started from</div>
				<div is="i18n-div">Progress</div>
				<div is="i18n-div">Final index</div>
			</div>
			<div>
				<div is="i18n-div">Receive</div>
				<div>${receiveStart}</div>
				<div>${receiveProgress||''}</div>
				<div>${receiveFinal||''}</div>
			</div>
			<div>
				<div is="i18n-div">Change</div>
				<div>${changeStart}</div>
				<div>${changeProgress||''}</div>
				<div>${changeFinal||''}</div>
			</div>
		</div>
		`
	}

	async alertUTXOIndexSupportIssue(){
		let title = html`<fa-icon class="big warning" 
			icon="exclamation-triangle"></fa-icon> ${T('Attention !')}`;

		let body = html`${i18nHTMLFormat(`'utxoindex' flag is missing from ANUMAD config.<br />
			Please inform the wallet administrator.<br />`)}
		`
		let {btn} = await FlowDialog.alert({
			title, body, cls:'with-icon big warning'
		})
		//if(btn != 'next')
		//	return
	}

	findTxIndex(transaction){
		let index = this.txs.findIndex(tx=>tx.ts<transaction.ts);
		if(index<0){
			return this.txs.length+100;
		}
		return index
	}
	async loadData() {
		let dots = setInterval(()=>{
			this.dots += '.';
			if(this.dots.length > 5)
				this.dots = '.';
		}, 333);
		try {
			this.isLoading = true;
			let cache = await getCacheFromStorage()
			if(cache){
				this.wallet.restoreCache(cache);
			}
			/*if (this._isCache) {
				this.log("calling loadData-> refreshState")
				await this.refreshState();
				this.isLoading = false;
			}else{*/
				this.log("calling loadData-> wallet.addressDiscovery")
				//if(this.grpcFlags.utxoIndex)
					await this.wallet.sync();
				//this.saveCache();
				this.isLoading = false;
			/*}*/
		} catch (err) {
			this.isLoading = false;
			this.showError(err);
		}
		clearInterval(dots);
		this.updateFaucetBalance();
	}
	connectedCallback(){
		super.connectedCallback();
		let mobileSuffix = isMobile?'-mobile':'';
		let openDialog = document.createElement('anuma-open-dialog');
		openDialog.hideLogo = !!this.hideOpenWalletLogo;
		this.parentNode.insertBefore(openDialog, this.nextSibling)
		this.sendDialog = document.createElement("anuma-send-dialog"+mobileSuffix);
		this.parentNode.appendChild(this.sendDialog);
		this.receiveDialog = document.createElement("anuma-receive-dialog"+mobileSuffix);
		this.parentNode.appendChild(this.receiveDialog);
		this.seedsDialog = document.createElement("anuma-seeds-dialog");
		this.parentNode.appendChild(this.seedsDialog);
		let t9Dialog = document.createElement("anuma-t9-dialog");
		this.parentNode.appendChild(t9Dialog);
		let qrscannerDialog = document.createElement("anuma-qrscanner-dialog");
		qrscannerDialog.debug = this.debugscanner
		this.parentNode.appendChild(qrscannerDialog);
		let uploadFileDialog = document.createElement("anuma-upload-file-dialog");
		this.parentNode.appendChild(uploadFileDialog);

		const {workerCorePath} = window.AnumaConfig||{}
		initAnumaFramework({
			workerPath: workerCorePath||"/anuma-wallet-worker/worker.js?ident="+(window.AnumaConfig?.ident||"")
		}).then(()=>{
			let encryptedMnemonic = getLocalWallet()?.mnemonic;
			this.initWallet(encryptedMnemonic)
		})
	}
	
	initWallet(encryptedMnemonic){
		if(encryptedMnemonic){
			showWalletInitDialog({
				mode:"open",
				wallet:this,
				hideable:false
			}, (err, info)=>{
				info.encryptedMnemonic = encryptedMnemonic;
				this.handleInitDialogCallback(info)
			})
		}else{
			showWalletInitDialog({
				mode:"init",
				wallet:this,
				hideable:false,
				isFresh:true
			}, (err, info)=>{
				//console.log("showWalletInitDialog:result", info)
				this.handleInitDialogCallback(info)
			})
		}
	}
	async handleInitDialogCallback({dialog, password, seedPhrase, encryptedMnemonic}){
		console.log("$$$$$$$ INIT NETWORK SETTINGS - START");
		await this.initNetworkSettings();
		console.log("$$$$$$$ INIT NETWORK SETTINGS - DONE");

		const { network, rpc } = this;
		console.log("$$$$$$$ INIT NETWORK SETTINGS", { network, rpc });

		if(!rpc)
			return FlowDialog.alert(i18n.t("Error"), i18n.t("Anuma Daemon config is missing."));

		this.initDaemonRPC();
		this.initHelpers();

		let {mode} = dialog;
		//console.log("$$$$$$$ mode", mode, encryptedMnemonic)
		if(mode =="open"){
			const wallet = await Wallet.import(password, encryptedMnemonic, {network, rpc})
			.catch(error=>{
				console.log("import wallet error:", error)
				dialog.setError(i18n.t("Incorrect password."));
			});

			if(!wallet)
				return

			dialog.hide();
			//console.log("open wallet", wallet)
			this.setWallet(wallet);
			return
		}
		if(mode == "import"){
			const wallet = await Wallet.import(password, encryptedMnemonic, {network, rpc})
			.catch(error=>{
				console.log("import wallet error:", error)
				dialog.setError(i18n.t("Incorrect password."));
			});

			//console.log("Wallet imported", encryptedMnemonic)

			if(!wallet)
				return

			encryptedMnemonic = await wallet.export(password);
			setLocalWallet(encryptedMnemonic, this.walletMeta);
			this.setWallet(wallet);
			return
		}
		if(mode == "create"){
			dialog.hide();
			const wallet = new Wallet(null,null, {network,rpc});
			const mnemonic = await wallet.mnemonic;
			this.openSeedsDialog({mnemonic, hideable:false}, async({finished})=>{
				if(!finished)
					return

				encryptedMnemonic = await wallet.export(password);
				setLocalWallet(encryptedMnemonic, this.walletMeta);
				this.setWallet(wallet);
			})
			return
		}

		if(mode == "recover"){
			const { network, rpc } = this;

			//console.log("recover:Wallet:seedPhrase, password", seedPhrase, password)
			let wallet;
			try{
				wallet = Wallet.fromMnemonic(seedPhrase, { network, rpc });
			}catch(error){
				console.log("recover:Wallet.fromMnemonic error", error)
				dialog.setError(i18n.t("Invalid seed")+` (${error.message})`);
			}

			if(!wallet)
				return
			const encryptedMnemonic = await wallet.export(password);
			setLocalWallet(encryptedMnemonic, this.walletMeta);
			dialog.hide();
			this.setWallet(wallet);
			return
		}
	}
	showSeedRecoveryDialog(){
		let encryptedMnemonic = getLocalWallet().mnemonic;
		this.openSeedsDialog({encryptedMnemonic, step:1}, ({finished})=>{
			if(finished){
				this.requestUpdate("have-backup", null)
			}
		})
	}
	openSeedsDialog(args, callback){
		this.seedsDialog.open(args, callback)
	}
	showTxDialog(){
		if(!this.txDialog){
			this.txDialog = document.createElement("anuma-tx-dialog");
			this.parentNode.appendChild(this.txDialog);
		}
		this.txDialog.open({wallet:this}, (args)=>{})
	}
	showSendDialog(){
		this.sendDialog.open({wallet:this}, (args)=>{
			this.sendTx(args);
		})
	}
	showReceiveDialog(){
		let address = this.receiveAddress;
		this.receiveDialog.open({address}, (args)=>{
		})
	}

	async isValidAddress(address){
		let [prefix] = address.split(":");
		if(window.mobileMode && prefix=="anumatest")
			return true;

		let minningAddress = await this.getMiningAddress()
		let [prefix2] = minningAddress.split(":")
		return prefix == prefix2;
	}

	async getMiningAddress(){
		await this.walletSignal
		if(this.receiveAddress)
			return Promise.resolve(this.receiveAddress);

		return this.wallet.receiveAddress;
	}

	addPreparingTransactionNotification(args){
		this.preparingTxNotifications.set(args.uid, args);
		this.requestUpdate("preparingTxNotifications")
	}

	removePreparingTransactionNotification({uid}){
		this.preparingTxNotifications.delete(uid);
		this.requestUpdate("preparingTxNotifications")
	}

	/*
	updatePreparingTransactionNotification({uid, txid}){
		let info = this.preparingTxNotifications.get(uid)
		if(!info)
			info.txid = txid;
	}
	*/

	async sendTx(args){
		const {
			address, amount, note, fee,
			calculateNetworkFee, inclusiveFee
		} = args;
		//console.log("sendTx:args", args)
		let uid;
		if(amount > 10){
			uid = UID();
			this.addPreparingTransactionNotification({uid, amount, address, note})
		}

		const response = await this.wallet.submitTransaction({
			toAddr: address,
			amount,
			fee, calculateNetworkFee, inclusiveFee, note
		}).catch(err=>{
			let msg = err.error || err.message || err;
			let error = (msg+"").replace("Error:", '')
			console.log("error", error)
			if(/Invalid Argument/.test(error))
				error = i18n.t("Please provide correct address and amount");
			uid && this.removePreparingTransactionNotification({uid});
			FlowDialog.alert("Error", html`${error}${this.buildDebugInfoForDialog(err)}`);
		})

		if(uid){
			//if(response?.txid)
			//	this.updatePreparingTransactionNotification({uid, txid:response.txid});
			//else
				this.removePreparingTransactionNotification({uid});
		}

		console.log("sendTx: response", response)
	}

	async estimateTx(args){
		const {
			address, amount, note, fee,
			calculateNetworkFee, inclusiveFee
		} = args;
		console.log("estimateTx:args", args)

		let error = undefined;
		const data = await this.wallet.estimateTransaction({
			toAddr: address,
			amount,
			fee, calculateNetworkFee, inclusiveFee, note
		}).catch(err=>{
			let msg = err.error || err.message || err;
			error = (msg+"").replace("Error:", '');
			if(/Invalid Argument/.test(error))
				error = i18n.t("Please provide address and amount");
			console.log("error", err);
			//error = 'Unable to estimate transaction fees';//(err+"").replace("Error:", '')
		})

		let result = {data, error}
		console.log("estimateTx:", data, error);

		return result;
	}


	makeFaucetRequest(subject, args){
		if(!window.flow?.app?.rpc?.request)
			return Promise.reject("flow.app.rpc issue")
		return flow.app.rpc.request(subject, args)
	}

	async updateFaucetBalance() {
		this.makeFaucetRequest('faucet-available', {address : this.receiveAddress})
		.then((resp) => {
			console.log(resp);
			const { available, period, ip } = resp;
			this.faucetStatus = null;
			this.faucetFundsAvailable = available;
			this.faucetPeriod = period;
			this.ip = ip;

		})
		.catch(ex => {
			console.log('faucet error:', ex);
		})
	}

	async getAnumaFromFaucet(amount) {
		this.makeFaucetRequest('faucet-request', {
			address : this.receiveAddress,
			amount: formatForMachine(amount)
		})
		.then((resp) => {
			console.log(resp);
			const { available, period, ip } = resp;
			this.faucetStatus = null;
			this.faucetFundsAvailable = available;
			this.faucetPeriod = period;
			this.ip = ip;

		})
		.catch(ex => {
			console.log('faucet error:', ex);
		})
	}

	clearUsedUTXOs(){
		this.wallet.clearUsedUTXOs();
	}


	requestFaucetFunds() {
		let max = formatForHuman(this.faucetFundsAvailable)
		showT9({
			value:'',
			max,
			heading:i18n.t('Request funds'),
			inputLabel:i18n.t('Amount in ANUM')
		}, ({value:amount, dialog})=>{
			let sompis = formatForMachine(amount||0);
			if(sompis > this.faucetFundsAvailable){
				let msg = i18n.t(`You can't request more than [n] ANUM.`)
						.replace("[n]", ANUM(this.faucetFundsAvailable||0))
				return dialog.setError(msg);//'
			}
			
			dialog.hide();

			this.getAnumaFromFaucet(amount)

		})
	}

	showQRScanner(args, callback){
		args = args||{};
		args.wallet = this;
		showQRScanner(args, ({value, dialog})=>{
			console.log("SCAN result", value)
			dialog.hide();
			if(!value)
				return
			let [address, searchQuery=''] = value.split("?");
			let searchParams = new URLSearchParams(searchQuery)
			let args = Object.fromEntries(searchParams.entries());
			let {amount} = args;
			callback({address, amount})
		})
	}

	showSendDialogWithQrScanner() {
		this.showQRScanner({isAddressQuery:true}, ({amount, address})=>{
			if(!address)
				return
			dpc(100, ()=>{
				this.sendDialog.open({wallet:this, amount, address}, (args)=>{
					this.sendTx(args);
				})
			})
		})
	}

	getTimeDelta(ts) {
		if(!ts)
			return '00:00:00';
		let delta = Math.round(ts / 1000);
		let sec = (delta % 60);
		let min = Math.floor(delta / 60 % 60);
		let hrs = Math.floor(delta / 60 / 60 % 24);
		let days = Math.floor(delta / 60 / 60 / 24);

		sec = (sec<10?'0':'')+sec;
		min = (min<10?'0':'')+min;
		hrs = (hrs<10?'0':'')+hrs;

		if(days && days >= 1) {
			return `${days.toFixed(0)} day${days>1?'s':''} ${hrs}:${min}:${sec}`;
		} else {
			return `${hrs}:${min}:${sec}`;
		}
	}

}
