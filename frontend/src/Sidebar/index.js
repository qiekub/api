import React from 'react'
import './index.css'

import {navigate/*,Router,Link*/} from '@reach/router'
import {gql} from 'apollo-boost'
import {loadPoi as query_loadPoi} from '../queries.js'

// import categories from '../data/dist/categories.json'
// import presets from '../data/dist/presets.json'
// import {getPreset} from '../functions.js'

import {
	Typography,
	Button,
	Snackbar,

	List,
	ListItem,
	ListItemIcon,
	ListItemText,

	Card,
	CardContent,
	Divider,
	Chip,

	TextField,
} from '@material-ui/core'
import {
	Map as MapIcon,
	Link as LinkIcon,

	Phone as PhoneIcon,
	Mail as MailIcon,

	Facebook as FacebookIcon,
	Instagram as InstagramIcon,
	Twitter as TwitterIcon,
	YouTube as YouTubeIcon,

	Edit as EditIcon,
	ArrowBack as ArrowBackIcon,
	ArrowForward as ArrowForwardIcon,
} from '@material-ui/icons'
import {
	Autocomplete
} from '@material-ui/lab'

// import reptile from './contemplative-reptile.jpg'

// console.log('categories', categories)
// console.log('presets', presets)
//
// const tags = {
//     "amenity": "bar",
//     "lgbtq": "primary",
// }
// console.log('The place is of type:', getPreset(tags,presets))


const ListItemLink = props => <ListItem button component="a" {...props} />

const tag_suggestions = ['youthcenter','cafe','bar','education','community-center','youthgroup','group','mediaprojects']
const this_is_a_place_for_suggestions = ['queer','undecided','friends','family','trans','inter','gay','hetero','bi','lesbian','friend']

export default class Sidebar extends React.Component {
	constructor(props) {
		super(props)

		this.state = {
			doc: {},
			changedProperties: {},
			stage: 'viewing', // viewing editing submitting
			whichSnackbarIsOpen: null,
		}

		this.edit = this.edit.bind(this)
		this.addComment = this.addComment.bind(this)
		this.submit = this.submit.bind(this)
		this.back = this.back.bind(this)

		this.renderView = this.renderView.bind(this)

		this.updateChangedProperties = this.updateChangedProperties.bind(this)
		this.getAgeRangeText = this.getAgeRangeText.bind(this)
		this.getChangesetDoc = this.getChangesetDoc.bind(this)
		this.closeAllSnackbarsOnTimeout = this.closeAllSnackbarsOnTimeout.bind(this)

		// this.docChanged = this.docChanged.bind(this)
		this.checkIfDocIdChanged = this.checkIfDocIdChanged.bind(this)

		this.editNewDoc = this.editNewDoc.bind(this)
		this.setDoc = this.setDoc.bind(this)
	}

	componentDidMount(){
		if (this.props.onFunctions) {
			this.props.onFunctions({
				editNewDoc: this.editNewDoc,
				setDoc: this.setDoc,
			})
		}

		this.checkIfDocIdChanged()
	}
	componentDidUpdate(){
		this.checkIfDocIdChanged()
	}
	async checkIfDocIdChanged(){
		const docID = this.props.docID
		if (!!docID && docID !== this.state.doc._id && this.props.onViewDoc) {
			// await navigate(`/place/${doc._id}/`)
			if (docID !== 'add') {
				this.props.onViewDoc(docID)
			}
		}
	}

	editNewDoc(typename){
		this.setState({
			doc: {},
			changedProperties: {},
		}, ()=>{
			this.props.onSetSidebarIsOpen(true)
			this.edit()
		})
	}
	setDoc(newDoc) {
		if (newDoc !== null && newDoc._id !== null) {
			// console.log('newDoc', newDoc)
			// console.log('The place is of type:', getPreset(newDoc.properties.tags,presets))

			this.setState({
				doc: newDoc,
				changedProperties: {},
				stage: 'viewing',
			}, ()=>{
				this.props.onSetSidebarIsOpen(true)
				this.props.onSetSearchBarValue(this.state.doc.properties.name)
			})
		}
	}

	edit(){
		this.setState({stage:'editing'})
		this.props.onSetSearchBarValue(!!this.state.doc && !!this.state.doc._id ? 'Edit Place' : 'Add Place')
	}
	addComment(){
		this.setState({stage:'submitting'})
	}
	getChangesetDoc(){
		// const properties = this.state.changedProperties
		let properties = {
			// ...this.state.doc.properties,
			...this.state.changedProperties,
		}
		console.log('properties', properties)

		// START parse age-range
		if (properties.min_age || properties.max_age) {
			let min_age = Number.parseInt(properties.min_age || this.state.doc.properties.min_age)
			let max_age = Number.parseInt(properties.max_age || this.state.doc.properties.max_age)
	
			if (Number.isNaN(min_age) || min_age < 0) {
				min_age = null
			}
			if (Number.isNaN(max_age) || max_age < 0) {
				max_age = null
			}
	
			if (
				!Number.isNaN(min_age) && min_age !== null &&
				!Number.isNaN(max_age) && max_age !== null
			){
				const numbers = [min_age,max_age]
				const numbersSorted = [...numbers].sort((a,b)=>a-b)
	
				min_age = numbersSorted[0]
				max_age = numbersSorted[1]
	
				if (
					numbers[0] === numbersSorted[0] &&
					numbers[1] === numbersSorted[1]
				) {
					if (properties.min_age) {
						properties.min_age = min_age
					}
					if (properties.max_age) {
						properties.max_age = max_age
					}
				}else{
					properties.min_age = min_age
					properties.max_age = max_age
				}
			}else{
				if (properties.min_age && min_age !== null) {
					properties.min_age = min_age
				}
				if (properties.max_age && max_age !== null) {
					properties.max_age = max_age
				}
			}
		}
		// END parse age-range

		const sources = this.state.changedProperties.sources
		const comment = this.state.changedProperties.comment

		if (Object.keys(properties).length > 0) {
			return {
				forDoc: this.state.doc._id,
				properties: {
					...properties,
					sources: undefined,
					comment: undefined,
					__typename: 'Place',
				},
				sources: sources,
				comment: comment,
				fromBot: false,
				created_by: 'queer.qiekub.com',
				created_at: new Date()*1,
			}
		}else{
			return null
		}
	}
	submit(){
		this.setState({whichSnackbarIsOpen:'submittingSuggestion'})

		const changesetDoc = this.getChangesetDoc()

		if (changesetDoc !== null) {
			let changeset_json = JSON.stringify(changesetDoc)
			changeset_json = changeset_json.replace(/"(\w+)"\s*:/g, '$1:')

			window.graphql.mutate({
				mutation: gql`mutation {
					addChangeset(changeset:${changeset_json}) {
						_id
						properties {
							... on Changeset {
								forDoc
								properties {
									__typename
								}
							}
						}
					}
				}`,
				refetchQueries: (
					this.state.doc._id
					? [{
						query: query_loadPoi,
						variables: {_id:this.state.doc._id},
					}]
					: undefined
				)
			}).then(async result => {
				console.info('mutate-result', result)

				this.setState({
					// changedProperties: {},
					// stage: 'viewing',
					whichSnackbarIsOpen:'finishedSuggesting',
				})

				setTimeout(async ()=>{
					if (this.state.doc._id !== result.data.addChangeset.properties.forDoc) {
						await navigate(`/place/${result.data.addChangeset.properties.forDoc}/`)
					}

					this.props.onViewDoc(result.data.addChangeset.properties.forDoc,true)
				}, 100)
			}).catch(error=>{
				console.error('mutate-error', error)

				this.setState({whichSnackbarIsOpen:'problemWhileSuggesting'})
			})
		}

	}
	back(){
		if (this.state.stage === 'submitting') {
			this.setState({stage:'editing'})
		} else if (this.state.stage === 'editing') {
			this.setState({stage:'viewing'})
		}
	}

	updateChangedProperties(newValues){
		this.setState((state, props) => {
			return {changedProperties: {
				...state.changedProperties,
				...newValues,
			}}
		})
	}

	getAgeRangeText(min_age,max_age){
		min_age = Number.parseInt(min_age)
		max_age = Number.parseInt(max_age)

		if (Number.isNaN(min_age) || min_age < 0) {
			min_age = null
		}
		if (Number.isNaN(max_age) || max_age < 0) {
			max_age = null
		}

		if (
			!!min_age && !Number.isNaN(min_age) &&
			!!max_age && !Number.isNaN(max_age)
		){
			const numbers = [min_age,max_age].sort((a,b)=>a-b)
			min_age = numbers[0]
			max_age = numbers[1]
		}

		return (
			min_age === null && max_age === null
			? '' // 'Für jedes Alter!'
			: (min_age === null && max_age !== null
			? 'Bis '+max_age+' Jahre'
			: (min_age !== null && max_age === null
			? 'Ab '+min_age+' Jahre'
			: (min_age !== null && max_age !== null
			? min_age+' bis '+max_age+' Jahre'
			: ''
		))))
	}

	parseLinks(links){
		// const links = `
		// 	https://www.anyway-koeln.de/
		// 	https://www.instagram.com/anyway_koeln/
		// `

		return [...new Set(links.match(/([a-z0-9]*:[^\s]+)/gmiu))].map(url=>new URL(url)).map(url=>{
			let obj = {
				url,
				href: url.href,
				text: url.href,
				type: 'default',
			}

			if (url.hostname === 'www.instagram.com' || url.hostname === 'instagram.com') {
				obj.type = 'instagram'
			} else if (url.hostname === 'www.facebook.com' || url.hostname === 'facebook.com') {
				obj.type = 'facebook'
			}else if (url.hostname === 'www.twitter.com' || url.hostname === 'twitter.com') {
				obj.type = 'twitter'
			}else if (url.hostname === 'www.youtube.com' || url.hostname === 'youtube.com') {
				obj.type = 'youtube'
			}else if (url.protocol === 'tel:') {
				obj.type = 'phonenumber'
				obj.text = url.pathname
			}else if (url.protocol === 'mailto:') {
				obj.type = 'mail'
				obj.text = url.pathname
			}

			return obj
		})
	}

	renderView(){
		const doc = this.state.doc

		if (!(
			!!doc &&
			!!doc._id &&
			!!doc.properties &&
			!!doc.properties.tags
		)) {
			return null
		}

		const properties = doc.properties
		const tags = properties.tags

		const name = properties.name

		const age_range_text = this.getAgeRangeText(tags.min_age, tags.max_age)

		// https://wiki.openstreetmap.org/wiki/Key:contact
		//
		// properties.links = `
		// 	https://www.anyway-koeln.de/
		// 	https://www.instagram.com/anyway_koeln/
		// 	https://www.facebook.com/anyway_koeln/
		// 	https://www.youtube.com/anyway_koeln/
		// 	https://www.twitter.com/anyway_koeln/
		// 	tel:09234658723
		// 	mailto:kjqhgr@sadf.asdf
		// `

		// const links = this.parseLinks(properties.links && properties.links.length > 0 ? properties.links : [])
		const links = [
			(!!tags.website ? {
				type: 'website',
				href: tags.website,
				text: tags.website,
			} : null),
			(!!properties.osmID ? {
				type: 'osm',
				href: 'https://openstreetmap.org/'+properties.osmID,
				text: 'View on OpenStreetMap',
			} : null)
		].filter(link=>link!==null)

		const linkIcons = {
			osm: (<MapIcon style={{color:'black'}} />),

			phonenumber: (<PhoneIcon style={{color:'black'}} />),
			mail: (<MailIcon style={{color:'black'}} />),

			youtube: (<YouTubeIcon style={{color:'black'}} />),
			twitter: (<TwitterIcon style={{color:'black'}} />),
			facebook: (<FacebookIcon style={{color:'black'}} />),
			instagram: (<InstagramIcon style={{color:'black'}} />),

			default: (<LinkIcon style={{color:'black'}} />),
		}

		return (<React.Fragment key="view">
			<Card elevation={6} className={this.props.className}>
				{/*<CardMedia
					style={{marginTop:'-86px',height:'240px',background:'black'}}
					title="Contemplative Reptile"
					component="div"
					image={reptile}
				/>*/}

				<CardContent style={{margin:'0 16px'}}>
					<Typography gutterBottom variant="h5" component="h2">
						{name}
					</Typography>

					<Typography gutterBottom variant="body2" component="p" color="textSecondary">{properties.address}</Typography>
					
					{age_range_text === '' ? null : <Typography variant="body2" component="p" color="textSecondary">{age_range_text}</Typography>}
				
				</CardContent>
				{/*<CardContent style={{
					padding: '0 32px 16px 32px',
					display: 'flex',
					justifyContent: 'flex-start',
					flexWrap: 'wrap',
				}}>
					{(properties.tags || []).map(tag => <Chip key={tag} label={tag} style={{margin:'4px'}}/>)}
				</CardContent>*/}
				<Divider />
				<CardContent>
					<List dense>
						{links.filter(link=>link.type!=='phonenumber'&&link.type!=='mail').map(link => (
							<ListItemLink target="_blank" key={link.href} href={link.href}>
								<ListItemIcon>{(!!linkIcons[link.type] ? linkIcons[link.type] : linkIcons.default)}</ListItemIcon>
								<ListItemText primary={link.text} />
							</ListItemLink>
						))}
					</List>

					<List dense>
						{links.filter(link=>link.type==='phonenumber'||link.type==='mail').map(link => (
							<ListItemLink target="_blank" key={link.href} href={link.href}>
								<ListItemIcon>{(!!linkIcons[link.type] ? linkIcons[link.type] : linkIcons.default)}</ListItemIcon>
								<ListItemText primary={link.text} />
							</ListItemLink>
						))}
					</List>
				
					<div style={{padding:'16px 0 0 0',textAlign:'center'}}>
						<Button onClick={this.edit} variant="outlined" size="large" className="roundButton" startIcon={<EditIcon style={{color:'black'}} />}>
							Suggest an edit
						</Button>
					</div>

				</CardContent>
			</Card>
		</React.Fragment>)
	}

	renderEdit(){
		const properties = {
			...this.state.doc.properties,
			...this.state.changedProperties,
		}

		const inputStyleProps = {
			style: {marginBottom:'16px'},
			variant: 'outlined',
		}
		const commonTextFieldProps = (options) => {
			// const options = {
			//	key: 'min_age', // fieldName
			// 	parser: value => value,
			// }

			return {
				...inputStyleProps,
				defaultValue: (properties[options.key] || ''),
				onChange: e => {
					let value = e.target.value
					// if (options.parser) {
					// 	value = options.parser(value)
					// }
					this.updateChangedProperties({[options.key]:value})
				},
				multiline: true,
				fullWidth: true,
				key: 'TextField_'+options.key,
			}
		}

		const age_range_text = this.getAgeRangeText(properties.min_age, properties.max_age)

		return (<Card key="edit" elevation={6} className={this.props.className}>
			<CardContent style={{margin:'0 16px'}}>
				<Typography gutterBottom variant="h5" component="h2">
					{!!this.state.doc && !!this.state.doc._id ? 'Edit Place' : 'Add Place'}
				</Typography>
			</CardContent>
			<Divider />	
			<CardContent>

				<TextField {...commonTextFieldProps({key:'name'})} label="Name"/>
				<TextField {...commonTextFieldProps({key:'address'})} label="Address"/>

				<fieldset style={{
					padding: '0 16px 8px 16px',
					border: '1px solid rgba(0, 0, 0, 0.23)',
					borderRadius: '3px',
					marginBottom: '16px',
					marginTop: '-10px',
				}}>
					<Typography gutterBottom variant="caption" component="legend" color="textSecondary" style={{
						// background: 'white',
						// marginTop: '-26px',
						// display: 'inline-block',
						// position: 'absolute',
						padding: '0 5px',
					}}>
						Age Range {age_range_text !== '' ? ' — '+age_range_text : ''}
					</Typography>
					<div style={{
						display: 'flex',
						alignItems: 'center',
					}}>
						<Typography variant="body2" color="textSecondary" style={{padding:'0 16px 0 0',height:'21px',lineHeight:'1.1875em'}}>From</Typography>
						<TextField {...commonTextFieldProps({key:'min_age'})} multiline={false} inputProps={{type:"Number"}} placeholder="Minimum" fullWidth={false} variant="standard" style={{width:'50%'}}/>
						<Typography variant="body2" color="textSecondary" style={{padding:'0 16px',height:'21px',lineHeight:'1.1875em'}}>to</Typography>
						<TextField {...commonTextFieldProps({key:'max_age'})} multiline={false} inputProps={{type:"Number"}} placeholder="Maximum" fullWidth={false} variant="standard" style={{width:'50%'}}/>
					</div>
				</fieldset>

				<Autocomplete
					multiple
					freeSolo
					disableClearable
					disableCloseOnSelect={false}
					options={tag_suggestions}
					defaultValue={properties.tags || []}
					renderTags={(suggestions, getProps) => {
						return suggestions.map((suggestion, index) => (<Chip key={suggestion} label={suggestion} {...getProps({index})} />))
					}}
					renderInput={params => (<TextField {...params} label="Tags" {...inputStyleProps}/>)}
					onChange={(e,value)=>this.updateChangedProperties({tags:value})}
				/>

				<Autocomplete
					multiple
					freeSolo
					disableClearable
					disableCloseOnSelect={false}
					options={this_is_a_place_for_suggestions}
					defaultValue={properties.this_is_a_place_for || []}
					renderTags={(suggestions, getProps) => {
						return suggestions.map((suggestion, index) => (<Chip key={suggestion} label={suggestion} {...getProps({index})} />))
					}}
					renderInput={params => (<TextField {...params} label="Whom's it for?" {...inputStyleProps}/>)}
					onChange={(e,value)=>this.updateChangedProperties({this_is_a_place_for:value})}
				/>

				<TextField {...commonTextFieldProps({key:'links'})} label="Links" rows={3} rowsMax={99} helperText={'Only links are accepted.'/* Use markdown to add a title. */}/>

				<div style={{padding:'16px 0 0 0',textAlign:'right'}}>
					{!!this.state.doc && !!this.state.doc._id ? (<Button style={{float:'left'}} onClick={this.back} size="large" className="roundButton" startIcon={<ArrowBackIcon style={{color:'black'}} />}>
						Back
					</Button>) : null}
					<Button onClick={this.addComment} variant="outlined" size="large" className="roundButton" endIcon={<ArrowForwardIcon style={{color:'black'}} />}>
						Next
					</Button>
				</div>
			</CardContent>
		</Card>)
	}

	renderSubmitScreen(){
		const changesetDoc = this.getChangesetDoc()
		if (changesetDoc === null) {

					
				
			return (<Card key="submit" elevation={6} className={this.props.className}>
				<CardContent style={{margin:'0 16px'}}>
					<Typography gutterBottom variant="h6" component="h2">
						Did you change anything?
					</Typography>
				</CardContent>
				<Divider />
				<CardContent>
					<Typography style={{margin:'0 16px'}} gutterBottom variant="body2" component="p">
						Go back to suggest an edit.
					</Typography>
	
					<div style={{padding:'16px 0 0 0',textAlign:'right'}}>
						<Button style={{float:'left'}} onClick={this.back} size="large" className="roundButton" startIcon={<ArrowBackIcon style={{color:'black'}} />}>
							Back
						</Button>
					</div>
				</CardContent>
			</Card>)
		}

		// const properties = {
		// 	...this.state.doc.properties,
		// 	...this.state.changedProperties,
		// }

		const inputStyleProps = {
			style: {marginBottom:'16px'},
			variant: 'outlined',
		}
		const commonTextFieldProps = (options) => {
			// const options = {
			//	key: 'min_age', // fieldName
			// 	parser: value => value,
			// }

			return {
				...inputStyleProps,
				// defaultValue: (properties[options.key] || ''),
				onChange: e => {
					let value = e.target.value
					// if (options.parser) {
					// 	value = options.parser(value)
					// }
					this.updateChangedProperties({[options.key]:value})
				},
				multiline: true,
				fullWidth: true,
				key: 'TextField_'+options.key,
			}
		}

		return (<Card key="submit" elevation={6} className={this.props.className}>
			<CardContent style={{margin:'0 16px'}}>
				<Typography gutterBottom variant="h6" component="h2">
					What did you change
				</Typography>
			</CardContent>
			<Divider />
			<CardContent>

				{/*
					https://wiki.openstreetmap.org/wiki/Good_changeset_comments
				*/}
				
				<TextField {...commonTextFieldProps({key:'comment'})} label="Comment" placeholder="Brief description of your contributions" />
				<TextField {...commonTextFieldProps({key:'sources'})} label="Sources" placeholder="URLs..." />
				
				<div style={{padding:'16px 0 0 0',textAlign:'right'}}>
					<Button style={{float:'left'}} onClick={this.back} size="large" className="roundButton" startIcon={<ArrowBackIcon style={{color:'black'}} />}>
						Back
					</Button>
					<Button onClick={this.submit} variant="outlined" size="large" className="roundButton" endIcon={<ArrowForwardIcon style={{color:'black'}} />}>
						Suggest
					</Button>
				</div>
			</CardContent>

			<CardContent>
				<TextField disabled value={JSON.stringify(changesetDoc,null,'\t')} multiline label="The data we'll upload:" style={{marginBottom:'16px'}} variant="filled" fullWidth/>
			</CardContent>
		</Card>)
	}

	closeAllSnackbarsOnTimeout(event,reason){
		if (reason === 'timeout') {
			this.setState({whichSnackbarIsOpen:null})
		}
	}

	render() {
		// if (['viewing','editing','submitting'].includes(this.state.stage)) {
			let stageComponent = null
			if (this.state.stage === 'viewing') {
				stageComponent = this.renderView()
			} else if (this.state.stage === 'editing') {
				stageComponent = this.renderEdit()
			} else if (this.state.stage === 'submitting') {
				stageComponent = this.renderSubmitScreen()
			}
	
			return (<>
				{stageComponent}
				<Snackbar
					message="Submitting..."
					anchorOrigin={{vertical:'bottom',horizontal:'left'}}
					open={this.state.whichSnackbarIsOpen === 'submittingSuggestion'}
				/>
				<Snackbar
					message="Couldn't submit!"
					anchorOrigin={{vertical:'bottom',horizontal:'left'}}
					open={this.state.whichSnackbarIsOpen === 'problemWhileSuggesting'}
					autoHideDuration={6000}
					onClose={this.closeAllSnackbarsOnTimeout}
				/>
				<Snackbar
					message="Your suggestion got submitted!"
					anchorOrigin={{vertical:'bottom',horizontal:'left'}}
					open={this.state.whichSnackbarIsOpen === 'finishedSuggesting'}
					autoHideDuration={6000}
					onClose={this.closeAllSnackbarsOnTimeout}
				/>
			</>)
		// }else{
		// 	return null
		// }
	}
}