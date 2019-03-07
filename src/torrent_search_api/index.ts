import TorrentSearchApi, { Torrent } from 'torrent-search-api';
import atob from 'atob';
import path from 'path'

import {torrentToken} from '../../secret/secret'

TorrentSearchApi.enableProvider('YggTorrent', torrentToken.login, torrentToken.mdp)

interface EnrichedTorrent{
    t:Torrent,
    b64:string,
    meta:{
        speed:string
    }
}

const SPEED_STATES:{s:number,t:string}[] = [
    {s:0,t:'unvailable'},
    {s:1,t:'ultra-slow'},
    {s:3,t:'slow'},
    {s:8,t:'normal'},
    {s:20,t:'fast'},
    {s:50,t:'ultra-fast'}
]

class SearchAPI{
    private folder:string;

    constructor(folder:string) {
        this.folder = folder;
    }

    public search(q: string, c="", l=40){
        /*
            q: query
            c: category to search in
            l: max number of torrents fetched
        */
        return new Promise<EnrichedTorrent[]>((resolve, reject) => {
            TorrentSearchApi.search(q, c, l).then(
                (torrents) => {
                    resolve(torrents.map(torrent => {
                        // set speed
                        let speed = SPEED_STATES[0].t
                        SPEED_STATES.forEach((state)=>{
                            if((torrent as any).seeds >= state.s){
                                speed = state.t
                            }
                        })
                        // normalize title
                        const normalizedTitleTorrent = {
                            ...torrent, 
                            title: torrent.title.normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/ /g, "_")
                        }
                        return {
                            b64:this.b64Serial(normalizedTitleTorrent),
                            t:torrent,
                            meta:{
                                speed
                            }
                        }
                    }));
                }
            ).catch((err) => reject(err))
        })
    }

    public download(torrent:Torrent, name:string, callback:any){
        TorrentSearchApi.downloadTorrent(torrent, path.join(this.folder, name))
        .then(()=>callback(null,true))
        .catch((err) => {
            console.error(err)
            callback(err,false)
        })
    }

    public b64ToTor(b64:string){
        const jTorrent = this.b64DeSerial(b64)
        // should be verified, jTorrent is a user input
        return (jTorrent as Torrent)
    }

    private b64Serial(json:any){
        return Buffer.from(JSON.stringify(json)).toString('base64')
    }

    private b64DeSerial(b64:string){
        // atob : Decodes a string of data which has been encoded using base-64 encoding.
        return JSON.parse(atob(b64).toString())
    }
}

if(process.env.TORRENT_DIR === undefined){
    throw Error("TORRENT_DIR is undefined")
}
const searchApi = new SearchAPI(process.env.TORRENT_DIR as string)

export {searchApi, EnrichedTorrent};