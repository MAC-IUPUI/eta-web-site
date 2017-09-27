import * as eta from "../eta";
import * as db from "../db";

@eta.mvc.route("/home")
@eta.mvc.controller()
export default class HomeController extends eta.IHttpController {
    @eta.mvc.get()
    public async index(): Promise<void> {
        // TODO: Implement
    }
}
